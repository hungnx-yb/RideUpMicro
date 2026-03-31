import axiosClient from "./axiosClient";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const bookingPath = import.meta.env.VITE_BOOKING_SERVICE_PATH || "/api/booking";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedBookingPath = bookingPath.startsWith("/") ? bookingPath : `/${bookingPath}`;
const bookingBaseUrl = `${normalizedGatewayUrl}${normalizedBookingPath}`;

function unwrapApiResponse(response) {
  return response?.data?.result;
}

export async function createBookingApi(payload) {
  const response = await axiosClient.post(`${bookingBaseUrl}/bookings`, payload);
  return unwrapApiResponse(response);
}

export async function getMyBookingsApi() {
  const response = await axiosClient.get(`${bookingBaseUrl}/bookings/my-bookings`);
  return unwrapApiResponse(response) || [];
}

export async function cancelBookingApi(bookingId, cancelReason = "") {
  const payload = cancelReason ? { reason: cancelReason } : {};
  const response = await axiosClient.post(`${bookingBaseUrl}/bookings/${bookingId}/cancel`, payload);
  return unwrapApiResponse(response);
}
