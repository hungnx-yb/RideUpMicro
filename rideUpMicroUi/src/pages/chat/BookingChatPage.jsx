import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaPhone, FaReply, FaMapMarkerAlt, FaPaperclip, FaPaperPlane, FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaPhoneSlash } from "react-icons/fa";
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
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
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
  const ringtoneRef = useRef(null);
  const ringbackRef = useRef(null);
  const endCallAudioRef = useRef(null);
  // callIdRef mirrors callId state so WebRTC callbacks always get the latest value (avoids stale closure)
  const callIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const otherUser = conversation?.otherUser || null;
  const otherUserName = otherUser?.fullName?.trim() || otherUser?.email || "Đối tác";
  const otherUserAvatar = resolveImageUrl(otherUser?.avatarUrl);
  const otherUserInitial = otherUserName.charAt(0).toUpperCase();
  const otherUserId = useMemo(() => {
    if (otherUser?.id) return otherUser.id;
    if (conversation?.participants && currentUserId) {
      return conversation.participants.find((id) => id !== currentUserId) || "";
    }
    return "";
  }, [otherUser, conversation, currentUserId]);

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
          markConversationReadApi(conversation.id).catch(() => { });
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
          startOffer(payload.callId).catch(() => { });
        }

        if (action === "CALL_REJECT" || action === "CALL_CANCEL" || action === "CALL_END") {
          finalizeCall();
        }

        if (action === "SDP_OFFER") {
          handleRemoteOffer(payload.callId, payload.sdp).catch(() => { });
        }

        if (action === "SDP_ANSWER") {
          handleRemoteAnswer(payload.sdp).catch(() => { });
        }

        if (action === "ICE_CANDIDATE") {
          handleRemoteCandidate(payload.candidate).catch(() => { });
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
    let interval;
    if (callStatus === "IN_CALL" && isCallConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus, isCallConnected]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const playSound = (ref, url, loop = false) => {
    if (!ref.current) {
      ref.current = new Audio(url);
      ref.current.loop = loop;
    }
    ref.current.currentTime = 0;
    ref.current.play().catch(() => { });
  };

  const stopSound = (ref) => {
    if (ref.current) {
      ref.current.pause();
      ref.current.currentTime = 0;
    }
  };

  useEffect(() => {
    if (callStatus === "RINGING") {
      playSound(ringtoneRef, "https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3", true);
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 500, 500, 500]);
      }
    } else if (callStatus === "CALLING") {
      playSound(ringbackRef, "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3", true);
    } else {
      stopSound(ringtoneRef);
      stopSound(ringbackRef);
      if (callStatus === "IDLE" && callId) {
        playSound(endCallAudioRef, "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
      }
      if ("vibrate" in navigator) {
        navigator.vibrate(0);
      }
    }
  }, [callStatus]);

  useEffect(() => {
    callIdRef.current = callId;
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
    };
  }, []);

  const updateCallId = (id) => {
    setCallId(id);
    callIdRef.current = id;
  };

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
      console.warn("sendCallSignal: chatClient is null");
      return;
    }
    console.log("sendCallSignal: Sending signal", payload);
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
      // Use callIdRef (not callId state) to avoid stale closure - state captured at creation time is always null
      const currentCallId = callIdRef.current;
      if (!event.candidate || !currentCallId) {
        console.log("WebRTC: Skipping ICE candidate", { hasCandidate: !!event.candidate, currentCallId });
        return;
      }
      console.log("WebRTC: Sending ICE_CANDIDATE for callId:", currentCallId);
      sendCallSignal({
        action: "ICE_CANDIDATE",
        callId: currentCallId,
        candidate: JSON.stringify(event.candidate),
      });
    };

    peer.onconnectionstatechange = () => {
      console.log("WebRTC Connection State:", peer.connectionState);
      if (peer.connectionState === "connected") {
        setIsCallConnected(true);
      } else if (peer.connectionState === "failed" || peer.connectionState === "closed" || peer.connectionState === "disconnected") {
        setIsCallConnected(false);
      }
    };

    peer.ontrack = (event) => {
      console.log("WebRTC: Received remote track", event.streams);
      const stream = event.streams?.[0];
      if (!stream) {
        return;
      }
      remoteStreamRef.current = stream;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(err => console.error("Error playing remote audio:", err));
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      // Apply current mute state to the new stream
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    } catch (err) {
      console.error("getUserMedia error:", err);
      setCallError("Không thể truy cập micro.");
      throw new Error("getUserMedia failed");
    }

    peerRef.current = peer;
    return peer;
  };

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  const startOffer = async (nextCallId) => {
    const targetCallId = nextCallId || callId;
    if (nextCallId) {
      updateCallId(nextCallId);
    }
    const peer = await ensurePeerConnection();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendCallSignal({
      action: "SDP_OFFER",
      callId: targetCallId,
      sdp: JSON.stringify(offer),
    });
  };

  const handleRemoteOffer = async (incomingCallId, sdp) => {
    if (!incomingCallId || !sdp) {
      return;
    }
    updateCallId(incomingCallId);
    const peer = await ensurePeerConnection();
    await peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));
    
    // Process queued candidates
    if (pendingCandidatesRef.current.length > 0) {
      console.log(`WebRTC: Processing ${pendingCandidatesRef.current.length} queued candidates`);
      for (const candidate of pendingCandidatesRef.current) {
        await peer.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate))).catch(e => console.error(e));
      }
      pendingCandidatesRef.current = [];
    }

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
    
    // Process queued candidates
    if (pendingCandidatesRef.current.length > 0) {
      console.log(`WebRTC: Processing ${pendingCandidatesRef.current.length} queued candidates`);
      for (const candidate of pendingCandidatesRef.current) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate))).catch(e => console.error(e));
      }
      pendingCandidatesRef.current = [];
    }
  };

  const handleRemoteCandidate = async (candidate) => {
    if (!candidate || !peerRef.current) {
      return;
    }
    
    if (!peerRef.current.remoteDescription) {
      console.log("WebRTC: Queuing remote candidate (remoteDescription not set)");
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    await peerRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate))).catch(e => {
      console.error("WebRTC: Error adding remote candidate", e);
    });
  };

  const finalizeCall = () => {
    setCallStatus("IDLE");
    updateCallId(null);
    setIncomingCall(null);
    setIsCallConnected(false);
    pendingCandidatesRef.current = [];
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
    console.log("handleStartCall: Triggered", { canStartCall, callStatus });
    if (!canStartCall) {
      setCallError("Không thể bắt đầu cuộc gọi. Vui lòng kiểm tra kết nối.");
      setTimeout(() => setCallError(""), 3000);
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
    const nextCallId = incomingCall.callId;
    updateCallId(nextCallId);
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
      {callStatus !== "IDLE" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-500" />
          
          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-[360px] overflow-hidden rounded-[40px] bg-white/95 shadow-[0_30px_100px_rgba(0,0,0,0.2)] backdrop-blur-2xl animate-in zoom-in-95 fade-in duration-500">
            {/* Inner Mesh Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -left-1/4 -top-1/4 h-full w-full rounded-full bg-emerald-400/10 blur-[60px] animate-[pulse_6s_infinite]" />
              <div className="absolute -right-1/4 -bottom-1/4 h-full w-full rounded-full bg-blue-400/10 blur-[60px] animate-[pulse_8s_infinite_1s]" />
            </div>

            <div className="flex flex-col items-center p-8 pt-12 pb-10">
              <div className="relative mb-8">
                {/* Ripple Effect */}
                {(callStatus === "CALLING" || callStatus === "RINGING") && (
                  <>
                    <div className="absolute inset-0 -z-10 animate-[ping_3s_infinite] rounded-full bg-emerald-500/15" />
                    <div className="absolute inset-0 -z-10 animate-[ping_3s_infinite_1.5s] rounded-full bg-emerald-500/5" />
                  </>
                )}
                
                <div className="relative h-32 w-32 rounded-full p-1.5 bg-gradient-to-tr from-emerald-400 to-blue-500 shadow-lg ring-4 ring-white">
                  <div className="h-full w-full rounded-full bg-white p-0.5">
                    {otherUserAvatar ? (
                      <img
                        src={otherUserAvatar}
                        alt={otherUserName}
                        className="h-full w-full rounded-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-5xl font-bold text-white">
                        {otherUserInitial}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-center space-y-2 mb-10">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {otherUserName}
                </h2>
                <div className="flex items-center justify-center">
                  <p className="text-sm font-semibold tracking-wide uppercase">
                    {callStatus === "CALLING" && <span className="text-emerald-600">Đang gọi...</span>}
                    {callStatus === "RINGING" && <span className="text-blue-600">Đang đổ chuông...</span>}
                    {callStatus === "IN_CALL" && (
                      <span className="flex flex-col items-center gap-2">
                        {!isCallConnected ? (
                          <span className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-600 border border-amber-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Đang kết nối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1 text-[12px] text-emerald-600 border border-emerald-100 font-mono">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            {formatDuration(callDuration)}
                          </span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="w-full space-y-8">
                {callStatus === "IN_CALL" && (
                  <div className="flex justify-center gap-8">
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                        isMuted 
                          ? "bg-rose-500 text-white shadow-lg" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
                    </button>
                    <button
                      type="button"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200"
                    >
                      <FaVolumeUp size={20} />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-center gap-10">
                  {callStatus === "RINGING" ? (
                    <>
                      <div className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRejectCall}
                          className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-200 transition-all hover:scale-110 active:scale-95"
                        >
                          <FaPhoneSlash size={28} />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Từ chối</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAcceptCall}
                          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-200 transition-all hover:scale-110 active:scale-95"
                        >
                          <FaPhone size={28} className="animate-pulse" />
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chấp nhận</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={handleHangUp}
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-200 transition-all hover:scale-110 active:scale-95"
                      >
                        <FaPhoneSlash size={28} />
                      </button>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kết thúc</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {callError ? (
        <div className="absolute left-1/2 top-10 z-[110] -translate-x-1/2 rounded-full bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-2xl animate-in slide-in-from-top-4">
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
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${isSocketConnected
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
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                        className={`max-w-[74%] rounded-3xl px-4 py-2.5 text-sm shadow-sm chat-rise ${isMine
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
                              className={`mb-2 inline-flex break-all text-xs font-semibold underline ${isMine ? "text-white" : "text-emerald-700"
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
