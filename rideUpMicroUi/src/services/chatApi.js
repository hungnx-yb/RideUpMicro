import axiosClient from "./axiosClient";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const chatPath = import.meta.env.VITE_CHAT_SERVICE_PATH || "/api/chat";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedChatPath = chatPath.startsWith("/") ? chatPath : `/${chatPath}`;
const chatBaseUrl = `${normalizedGatewayUrl}${normalizedChatPath}`;

function unwrapApiResponse(response) {
  return response?.data?.result;
}

export async function createConversationByBookingIdApi(bookingId) {
  if (!bookingId) {
    return null;
  }
  const response = await axiosClient.post(`${chatBaseUrl}/conversations/booking/${bookingId}`);
  return unwrapApiResponse(response);
}

export async function getConversationByBookingIdApi(bookingId) {
  if (!bookingId) {
    return null;
  }
  const response = await axiosClient.get(`${chatBaseUrl}/conversations/booking/${bookingId}`);
  return unwrapApiResponse(response);
}

export async function getConversationByIdApi(conversationId) {
  if (!conversationId) {
    return null;
  }
  const response = await axiosClient.get(`${chatBaseUrl}/conversations/${conversationId}`);
  return unwrapApiResponse(response);
}

export async function listConversationMessagesApi(conversationId, page = 0, size = 20) {
  if (!conversationId) {
    return { items: [], hasMore: false, page: 0, size };
  }
  const response = await axiosClient.get(`${chatBaseUrl}/conversations/${conversationId}/messages`, {
    params: { page, size },
  });
  return unwrapApiResponse(response) || { items: [], hasMore: false, page: 0, size };
}

export async function markConversationReadApi(conversationId) {
  if (!conversationId) {
    return null;
  }
  const response = await axiosClient.post(`${chatBaseUrl}/conversations/${conversationId}/read`);
  return unwrapApiResponse(response);
}

export async function uploadChatFileApi(file) {
  if (!file) {
    return null;
  }
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosClient.post(`${chatBaseUrl}/file/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return unwrapApiResponse(response);
}
