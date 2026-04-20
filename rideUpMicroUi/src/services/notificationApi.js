import axiosClient from "./axiosClient";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const notificationPath = import.meta.env.VITE_NOTIFICATION_SERVICE_PATH || "/api/notification";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedNotificationPath = notificationPath.startsWith("/") ? notificationPath : `/${notificationPath}`;
const notificationBaseUrl = `${normalizedGatewayUrl}${normalizedNotificationPath}`;

function unwrapApiResponse(response) {
  return response?.data?.result;
}

export async function listNotificationsApi({ page = 0, size = 20, status } = {}) {
  const params = { page, size };
  if (status) {
    params.status = status;
  }
  const response = await axiosClient.get(`${notificationBaseUrl}/notifications/my`, { params });
  return {
    items: unwrapApiResponse(response) || [],
    count: Number(response?.data?.count || 0),
    page,
    size,
  };
}

export async function getUnreadNotificationCountApi() {
  const response = await axiosClient.get(`${notificationBaseUrl}/notifications/unread-count`);
  const value = unwrapApiResponse(response);
  return Number(value || 0);
}

export async function markNotificationReadApi(notificationId) {
  if (!notificationId) {
    return null;
  }
  const response = await axiosClient.post(`${notificationBaseUrl}/notifications/${notificationId}/read`);
  return unwrapApiResponse(response);
}

export async function markAllNotificationsReadApi() {
  const response = await axiosClient.post(`${notificationBaseUrl}/notifications/read-all`);
  return Number(unwrapApiResponse(response) || 0);
}
