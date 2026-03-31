import axiosClient from "./axiosClient";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const paymentPath = import.meta.env.VITE_PAYMENT_SERVICE_PATH || "/api/payment";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedPaymentPath = paymentPath.startsWith("/") ? paymentPath : `/${paymentPath}`;
const paymentBaseUrl = `${normalizedGatewayUrl}${normalizedPaymentPath}`;

function unwrapApiResponse(response) {
  return response?.data?.result;
}

export async function getPaymentUrlByBookingId(bookingId) {
  const response = await axiosClient.get(`${paymentBaseUrl}/payments/booking/${bookingId}`);
  const payment = unwrapApiResponse(response);

  return payment?.paymentUrl || "";
}

export async function processVnpayCallbackApi(callbackParams) {
  const response = await axiosClient.get(`${paymentBaseUrl}/payments/vnpay/callback`, {
    params: callbackParams,
  });

  return unwrapApiResponse(response);
}
