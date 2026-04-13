import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaPhone, FaReply, FaMapMarkerAlt, FaPaperclip, FaPaperPlane } from "react-icons/fa";
import CustomerNavbar from "../../components/CustomerNavbar";
import DriverNavbar from "../../components/DriverNavbar";
import useAuth from "../../hooks/useAuth";
import {
  createConversationByBookingIdApi,
  listConversationMessagesApi,
  markConversationReadApi,
  uploadChatFileApi,
} from "../../services/chatApi";
import { getBookingDetailApi } from "../../services/bookingApi";
import { useChatSocket } from "../../context/ChatSocketContext";
import { getApiErrorMessage } from "../../services/authApi";
import { resolveImageUrl } from "../../utils/imageUrl";

function BookingChatPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { activeRole, user } = useAuth();
  const displayName = user?.fullName?.trim() || user?.email || "Tài xế";
  const currentUserId = user?.id || user?.userId || user?.sub || "";
  const [conversation, setConversation] = useState(null);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState("");
  const { client: chatClient, isConnected: isSocketConnected } = useChatSocket() || {};
  const messageSubRef = useRef(null);
  const readSubRef = useRef(null);
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadConversation = async () => {
      if (!bookingId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [booking, convo] = await Promise.all([
          getBookingDetailApi(bookingId),
          createConversationByBookingIdApi(bookingId),
        ]);

        if (!isMounted) {
          return;
        }

        setBookingDetail(booking);
        setConversation(convo);

        if (convo?.id) {
          const history = await listConversationMessagesApi(convo.id, 0, 50);
          if (!isMounted) {
            return;
          }
          setMessages(history?.items || []);
          await markConversationReadApi(convo.id);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(getApiErrorMessage(error, "Không tải được cuộc hội thoại."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadConversation();

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  useEffect(() => {
    if (!chatClient || !isSocketConnected || !conversation?.id) {
      return undefined;
    }

    const messageSub = chatClient.subscribe("/user/queue/messages", (frame) => {
      if (!frame?.body) {
        return;
      }
      try {
        const payload = JSON.parse(frame.body);
        if (!payload || payload.conversationId !== conversation.id) {
          return;
        }
        setMessages((prev) => [...prev, payload]);
        if (payload.senderId && payload.senderId !== currentUserId) {
          markConversationReadApi(conversation.id).catch(() => {});
        }
      } catch {
        // ignore parse errors
      }
    });

    const readSub = chatClient.subscribe("/user/queue/read", (frame) => {
      if (!frame?.body) {
        return;
      }
      try {
        JSON.parse(frame.body);
      } catch {
        // ignore parse errors
      }
    });

    messageSubRef.current = messageSub;
    readSubRef.current = readSub;

    return () => {
      messageSubRef.current?.unsubscribe();
      readSubRef.current?.unsubscribe();
      messageSubRef.current = null;
      readSubRef.current = null;
    };
  }, [chatClient, isSocketConnected, conversation?.id, currentUserId]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!pendingFile) {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
      setPendingPreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [pendingFile]);

  const handleSendMessage = async (content) => {
    const trimmed = (content || messageInput).trim();
    if (!conversation?.id) {
      return;
    }

    if (pendingFile) {
      try {
        setIsUploading(true);
        setErrorMessage("");
        const objectPath = await uploadChatFileApi(pendingFile);
        if (!objectPath) {
          throw new Error("Upload failed");
        }

        chatClient?.publish({
          destination: "/app/chat.send",
          body: JSON.stringify({
            conversationId: conversation.id,
            type: resolveMessageTypeFromFile(pendingFile),
            mediaUrl: objectPath,
            content: trimmed || undefined,
          }),
        });
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "Không tải được tệp đính kèm."));
        return;
      } finally {
        setIsUploading(false);
        setPendingFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }

    if (!trimmed) {
      return;
    }

    chatClient?.publish({
      destination: "/app/chat.send",
      body: JSON.stringify({
        conversationId: conversation.id,
        type: "TEXT",
        content: trimmed,
      }),
    });

    setMessageInput("");
  };

  const resolveMessageTypeFromFile = (file) => {
    const mimeType = file?.type || "";
    if (mimeType.startsWith("video/")) {
      return "VIDEO";
    }
    if (mimeType.startsWith("audio/")) {
      return "AUDIO";
    }
    return "IMAGE";
  };

  const handleUploadFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setPendingFile(file);
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) {
      return "";
    }
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const quickReplies = [
    "Em sẽ tới sau 5 phút",
    "Anh đang ở vị trí nào?",
    "OK anh, em tới ngay",
  ];

  return (
    <div
      className="relative min-h-screen bg-slate-50 text-slate-900"
      style={{
        "--chat-accent": "#16a34a",
        "--chat-accent-soft": "#22c55e",
        "--chat-ink": "#0f172a",
        "--chat-surface": "#ffffff",
      }}
    >
      {activeRole === "DRIVER" ? (
        <DriverNavbar driverName={displayName} tripsToday="" />
      ) : (
        <CustomerNavbar />
      )}

      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-20%] top-[-10%] h-80 w-80 rounded-full bg-emerald-200/60 blur-[120px]" />
          <div className="absolute right-[-10%] top-24 h-72 w-72 rounded-full bg-teal-200/50 blur-[120px]" />
          <div className="absolute bottom-[-12%] left-1/3 h-72 w-72 rounded-full bg-lime-200/40 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)]" />
        </div>

        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col gap-5 px-5 pb-5 pt-6">
          <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <aside className="flex w-full flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-emerald-100/60 backdrop-blur lg:w-80">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5"
              >
                <FaReply className="text-[11px]" />
                Quay lại
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">Ride chat</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/90 text-base font-semibold text-white shadow-lg shadow-emerald-200">
                <div className="flex h-full w-full items-center justify-center">D</div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {activeRole === "DRIVER" ? "Hành khách" : "Tài xế"}
                </p>
                <p className="text-[11px] text-slate-500">Đang cập nhật thông tin</p>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Điểm đón</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FaMapMarkerAlt className="text-emerald-500" />
                {bookingDetail?.pickupAddressText || "Đang cập nhật điểm đón"}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Điểm trả</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FaMapMarkerAlt className="text-rose-400" />
                {bookingDetail?.dropoffAddressText || "Đang cập nhật điểm trả"}
              </p>
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-emerald-100/60">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Cuộc hội thoại</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {isSocketConnected ? "Đang kết nối" : "Đang chờ kết nối"}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <FaPhone className="text-[11px]" />
                  Gọi
                </button>
              </div>
            </div>

            <div ref={messagesRef} className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
              {isLoading ? (
                <div className="text-sm text-slate-500">Đang tải hội thoại...</div>
              ) : null}
              {errorMessage ? <div className="text-sm text-rose-500">{errorMessage}</div> : null}
              {messages.map((message, index) => {
                const isMine = message.senderId && message.senderId === currentUserId;
                return (
                  <div
                    key={message.id || `${message.senderId}-${index}`}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-md chat-rise ${
                        isMine
                          ? "bg-[color:var(--chat-accent)] text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {message.mediaUrl ? (
                        message.type === "IMAGE" ? (
                          <img
                            src={resolveImageUrl(message.mediaUrl)}
                            alt="attachment"
                            className="mb-2 max-h-60 rounded-xl object-cover"
                          />
                        ) : (
                          <a
                            href={resolveImageUrl(message.mediaUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className={`mb-2 inline-flex break-all text-xs font-semibold underline ${
                              isMine ? "text-white" : "text-emerald-700"
                            }`}
                          >
                            Tệp đính kèm
                          </a>
                        )
                      ) : null}
                      {message.content ? <p className="leading-relaxed">{message.content}</p> : null}
                      <p
                        className={`mt-2 text-right text-[10px] ${
                          isMine ? "text-white/70" : "text-slate-400"
                        }`}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => handleSendMessage(reply)}
                  className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-200"
                >
                  <FaReply className="text-[10px]" />
                  {reply}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Gửi cập nhật nhanh</span>
                <span>1 file đính kèm</span>
              </div>
              {pendingPreviewUrl ? (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white p-3">
                  <img
                    src={pendingPreviewUrl}
                    alt="preview"
                    className="h-20 w-24 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-700">Ảnh đính kèm</p>
                    <button
                      type="button"
                      onClick={clearPendingFile}
                      className="mt-2 text-xs font-semibold text-rose-500"
                    >
                      Bỏ ảnh
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn"
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-200">
                    <FaPaperclip className="text-[11px]" />
                    {isUploading ? "Đang tải..." : "Đính kèm"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUploadFile}
                      accept="image/*,video/*,audio/*"
                      ref={fileInputRef}
                      disabled={isUploading}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={isUploading}
                    className="rounded-2xl bg-[color:var(--chat-accent)] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:-translate-y-0.5"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaPaperPlane className="text-[11px]" />
                      Gửi
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingChatPage;
