import { useEffect, useMemo, useRef, useState } from "react";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [messagesPage, setMessagesPage] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState("");
  const [callStatus, setCallStatus] = useState("IDLE");
  const [callId, setCallId] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callError, setCallError] = useState("");
  const { client: chatClient, isConnected: isSocketConnected } = useChatSocket() || {};
  const messageSubRef = useRef(null);
  const readSubRef = useRef(null);
  const callSubRef = useRef(null);
  const callErrorSubRef = useRef(null);
  const callSnapshotRef = useRef({ callId: null, callStatus: "IDLE" });
  const chatClientRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const messagesRef = useRef(null);
  const prependStateRef = useRef({ active: false, scrollTop: 0, scrollHeight: 0 });
  const fileInputRef = useRef(null);

  const otherUser = conversation?.otherUser || null;
  const otherUserName = otherUser?.fullName?.trim() || otherUser?.email || "Đối tác";
  const otherUserAvatar = resolveImageUrl(otherUser?.avatarUrl);
  const otherUserInitial = otherUserName.charAt(0).toUpperCase();
  const otherUserId = otherUser?.id || "";

  const canStartCall = useMemo(
    () => Boolean(isSocketConnected && chatClient && conversation?.id && otherUserId),
    [isSocketConnected, chatClient, conversation?.id, otherUserId]
  );

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
        setMessages([]);
        setMessagesPage(0);
        setMessagesCount(0);

        if (convo?.id) {
          const history = await listConversationMessagesApi(convo.id, 0, 10);
          if (!isMounted) {
            return;
          }
          setMessages(history?.items || []);
          setMessagesPage(1);
          setMessagesCount(history?.count || 0);
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
    if (!chatClient || !isSocketConnected) {
      return undefined;
    }

    const callSub = chatClient.subscribe("/user/queue/call", (frame) => {
      if (!frame?.body) {
        return;
      }
      try {
        const payload = JSON.parse(frame.body);
        if (!payload?.callId) {
          return;
        }

        if (payload.conversationId && conversation?.id && payload.conversationId !== conversation.id) {
          return;
        }

        const action = payload.action;
        if (action === "CALL_RINGING") {
          setCallId(payload.callId);
          if (payload.fromUserId && payload.fromUserId !== currentUserId) {
            setIncomingCall({
              callId: payload.callId,
              fromUserId: payload.fromUserId,
              conversationId: payload.conversationId,
            });
            setCallStatus("RINGING");
          } else {
            setCallStatus("CALLING");
          }
        }

        if (action === "CALL_INIT") {
          setCallId(payload.callId);
        }

        if (action === "CALL_ACCEPT") {
          setIncomingCall(null);
          setCallStatus("IN_CALL");
          if (payload.fromUserId && payload.fromUserId !== currentUserId) {
            return;
          }
          startOffer(payload.callId).catch(() => {});
        }

        if (action === "CALL_REJECT" || action === "CALL_CANCEL" || action === "CALL_END") {
          finalizeCall();
        }

        if (action === "SDP_OFFER") {
          handleRemoteOffer(payload.callId, payload.sdp).catch(() => {});
        }

        if (action === "SDP_ANSWER") {
          handleRemoteAnswer(payload.sdp).catch(() => {});
        }

        if (action === "ICE_CANDIDATE") {
          handleRemoteCandidate(payload.candidate).catch(() => {});
        }
      } catch {
        // ignore parse errors
      }
    });

    const callErrorSub = chatClient.subscribe("/user/queue/call-errors", (frame) => {
      if (!frame?.body) {
        return;
      }
      try {
        const payload = JSON.parse(frame.body);
        setCallError(payload?.message || "Cuộc gọi gặp lỗi.");
        finalizeCall();
      } catch {
        // ignore parse errors
      }
    });

    callSubRef.current = callSub;
    callErrorSubRef.current = callErrorSub;

    return () => {
      callSubRef.current?.unsubscribe();
      callErrorSubRef.current?.unsubscribe();
      callSubRef.current = null;
      callErrorSubRef.current = null;
    };
  }, [chatClient, isSocketConnected, currentUserId, conversation?.id]);

  useEffect(() => {
    callSnapshotRef.current = { callId, callStatus };
  }, [callId, callStatus]);

  useEffect(() => {
    chatClientRef.current = chatClient || null;
  }, [chatClient]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) {
      return;
    }

    if (prependStateRef.current.active) {
      const { scrollTop, scrollHeight } = prependStateRef.current;
      const nextHeight = container.scrollHeight;
      container.scrollTop = scrollTop + (nextHeight - scrollHeight);
      prependStateRef.current.active = false;
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const canLoadMore = messages.length < messagesCount;

  const handleLoadMore = async () => {
    if (!conversation?.id || isLoadingMore || !canLoadMore) {
      return;
    }

    const container = messagesRef.current;
    if (!container) {
      return;
    }

    try {
      setIsLoadingMore(true);
      prependStateRef.current = {
        active: true,
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      };

      const history = await listConversationMessagesApi(conversation.id, messagesPage, 10);
      const nextItems = history?.items || [];
      setMessages((prev) => [...nextItems, ...prev]);
      setMessagesPage((prev) => prev + 1);
      setMessagesCount(history?.count || messagesCount);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải thêm tin nhắn."));
      prependStateRef.current.active = false;
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesRef.current;
    if (!container || isLoadingMore || !canLoadMore) {
      return;
    }
    if (container.scrollTop <= 80) {
      handleLoadMore();
    }
  };

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

  useEffect(() => {
    return () => {
      const snapshot = callSnapshotRef.current;
      if (snapshot.callId && snapshot.callStatus !== "IDLE" && chatClientRef.current) {
        chatClientRef.current.publish({
          destination: "/app/call.signal",
          body: JSON.stringify({
            action: "CALL_END",
            callId: snapshot.callId,
          }),
        });
      }
      finalizeCall();
    };
  }, []);

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

  const openLightbox = (url) => {
    if (!url) {
      return;
    }
    setLightboxUrl(url);
  };

  const closeLightbox = () => {
    setLightboxUrl("");
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

  const sendCallSignal = (payload) => {
    if (!chatClient) {
      return;
    }
    chatClient.publish({
      destination: "/app/call.signal",
      body: JSON.stringify(payload),
    });
  };

  const ensurePeerConnection = async () => {
    if (peerRef.current) {
      return peerRef.current;
    }

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (event) => {
      if (!event.candidate || !callId) {
        return;
      }
      sendCallSignal({
        action: "ICE_CANDIDATE",
        callId,
        candidate: JSON.stringify(event.candidate),
      });
    };

    peer.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) {
        return;
      }
      remoteStreamRef.current = stream;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    } catch {
      setCallError("Không thể truy cập micro.");
      throw new Error("getUserMedia failed");
    }

    peerRef.current = peer;
    return peer;
  };

  const startOffer = async (nextCallId) => {
    if (nextCallId) {
      setCallId(nextCallId);
    }
    const peer = await ensurePeerConnection();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendCallSignal({
      action: "SDP_OFFER",
      callId: nextCallId || callId,
      sdp: JSON.stringify(offer),
    });
  };

  const handleRemoteOffer = async (incomingCallId, sdp) => {
    if (!incomingCallId || !sdp) {
      return;
    }
    setCallId(incomingCallId);
    const peer = await ensurePeerConnection();
    await peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    sendCallSignal({
      action: "SDP_ANSWER",
      callId: incomingCallId,
      sdp: JSON.stringify(answer),
    });
  };

  const handleRemoteAnswer = async (sdp) => {
    if (!sdp || !peerRef.current) {
      return;
    }
    await peerRef.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));
  };

  const handleRemoteCandidate = async (candidate) => {
    if (!candidate || !peerRef.current) {
      return;
    }
    await peerRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
  };

  const finalizeCall = () => {
    setCallStatus("IDLE");
    setCallId(null);
    setIncomingCall(null);
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  const handleStartCall = async () => {
    if (!canStartCall) {
      return;
    }
    setCallError("");
    setCallStatus("CALLING");
    sendCallSignal({
      action: "CALL_INIT",
      conversationId: conversation.id,
      targetUserId: otherUserId,
    });
  };

  const handleAcceptCall = () => {
    if (!incomingCall?.callId) {
      return;
    }
    setCallError("");
    sendCallSignal({
      action: "CALL_ACCEPT",
      callId: incomingCall.callId,
    });
    setCallStatus("IN_CALL");
  };

  const handleRejectCall = () => {
    if (!incomingCall?.callId) {
      return;
    }
    sendCallSignal({
      action: "CALL_REJECT",
      callId: incomingCall.callId,
    });
    finalizeCall();
  };

  const handleHangUp = () => {
    if (!callId) {
      return;
    }
    sendCallSignal({
      action: callStatus === "CALLING" ? "CALL_CANCEL" : "CALL_END",
      callId,
    });
    finalizeCall();
  };


  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-900"
      style={{
        "--chat-accent": "#16a34a",
        "--chat-accent-soft": "#22c55e",
        "--chat-ink": "#0f172a",
        "--chat-surface": "#ffffff",
      }}
    >
      {incomingCall ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
              Cuộc gọi đến
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{otherUserName}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleRejectCall}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={handleAcceptCall}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Chấp nhận
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {callStatus === "IN_CALL" || callStatus === "CALLING" ? (
        <div className="absolute left-1/2 top-24 z-40 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-700 shadow-lg">
          {callStatus === "CALLING" ? "Đang gọi..." : "Đang trong cuộc gọi"}
          <button
            type="button"
            onClick={handleHangUp}
            className="ml-3 rounded-full bg-rose-500 px-3 py-1 text-[10px] font-semibold text-white"
          >
            Kết thúc
          </button>
        </div>
      ) : null}
      {callError ? (
        <div className="absolute left-1/2 top-10 z-40 -translate-x-1/2 rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 shadow">
          {callError}
        </div>
      ) : null}
      {activeRole === "DRIVER" ? (
        <DriverNavbar driverName={displayName} tripsToday="" />
      ) : (
        <CustomerNavbar />
      )}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-20%] top-[-10%] h-80 w-80 rounded-full bg-emerald-200/60 blur-[120px]" />
          <div className="absolute right-[-10%] top-24 h-72 w-72 rounded-full bg-teal-200/50 blur-[120px]" />
          <div className="absolute bottom-[-12%] left-1/3 h-72 w-72 rounded-full bg-lime-200/40 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)]" />
        </div>

        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-1 flex-col gap-5 px-5 pb-5 pt-6">
          <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <aside className="flex h-full w-full flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-emerald-100/60 backdrop-blur lg:w-80">
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
              <div className="relative">
                {otherUserAvatar ? (
                  <img
                    src={otherUserAvatar}
                    alt={otherUserName}
                    className="h-11 w-11 rounded-2xl object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/90 text-base font-semibold text-white shadow-lg shadow-emerald-200">
                    {otherUserInitial}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{otherUserName}</p>
                <p className="text-[11px] text-slate-500">
                  {activeRole === "DRIVER" ? "Hành khách" : "Tài xế"}
                </p>
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

          <section className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-emerald-100/80 bg-white/95 p-5 shadow-xl shadow-emerald-200/70">
            <div className="absolute left-6 right-6 top-4 h-1 rounded-full bg-gradient-to-r from-emerald-400 via-lime-400 to-teal-400" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {otherUserAvatar ? (
                  <img
                    src={otherUserAvatar}
                    alt={otherUserName}
                    className="h-10 w-10 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/90 text-sm font-semibold text-white">
                    {otherUserInitial}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-slate-900">{otherUserName}</p>
                  <p className="text-[11px] text-slate-500">
                    {activeRole === "DRIVER" ? "Hành khách" : "Tài xế"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                    isSocketConnected
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isSocketConnected ? "Đang kết nối" : "Đang chờ kết nối"}
                </span>
                <button
                  type="button"
                  onClick={handleStartCall}
                  disabled={!canStartCall || callStatus === "CALLING" || callStatus === "IN_CALL"}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <FaPhone className="text-[11px]" />
                  {callStatus === "CALLING" ? "Đang gọi" : "Gọi"}
                </button>
              </div>
            </div>

            <div
              ref={messagesRef}
              onScroll={handleMessagesScroll}
              className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-3xl border border-slate-100 bg-gradient-to-b from-white via-slate-50 to-emerald-50/40 p-4"
            >
              {isLoadingMore ? (
                <div className="text-center text-xs text-slate-400">Đang tải thêm tin nhắn...</div>
              ) : null}
              {isLoading ? (
                <div className="text-sm text-slate-500">Đang tải hội thoại...</div>
              ) : null}
              {errorMessage ? <div className="text-sm text-rose-500">{errorMessage}</div> : null}
              {messages.map((message, index) => {
                const isMine = message.senderId && message.senderId === currentUserId;
                return (
                  <div
                    key={message.id || `${message.senderId}-${index}`}
                    className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    {!isMine ? (
                      otherUserAvatar ? (
                        <img
                          src={otherUserAvatar}
                          alt={otherUserName}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
                          {otherUserInitial}
                        </div>
                      )
                    ) : null}
                    <div
                      className={`max-w-[74%] rounded-3xl px-4 py-2.5 text-sm shadow-sm chat-rise ${
                        isMine
                          ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-200"
                          : "border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {message.mediaUrl ? (
                        message.type === "IMAGE" ? (
                          <img
                            src={resolveImageUrl(message.mediaUrl)}
                            alt="attachment"
                            className="mb-2 max-h-64 cursor-zoom-in rounded-2xl object-cover"
                            onClick={() => openLightbox(resolveImageUrl(message.mediaUrl))}
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
                    </div>
                    <div className={`text-[10px] ${isMine ? "text-emerald-600" : "text-slate-400"}`}>
                      {formatMessageTime(message.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sr-only">
              <audio ref={localAudioRef} autoPlay muted playsInline />
              <audio ref={remoteAudioRef} autoPlay playsInline />
            </div>


            <div className="mt-3 flex shrink-0 flex-col gap-3 rounded-2xl border border-emerald-100/80 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                
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

          {lightboxUrl ? (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4"
              onClick={closeLightbox}
              role="presentation"
            >
              <img
                src={lightboxUrl}
                alt="attachment preview"
                className="max-h-[85vh] w-auto max-w-[90vw] rounded-2xl object-contain shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              />
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute right-6 top-6 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow"
              >
                Đóng
              </button>
            </div>
          ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingChatPage;
