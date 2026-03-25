import axiosClient from "./axiosClient";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const tripPath = import.meta.env.VITE_TRIP_SERVICE_PATH || "/api/trip";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedTripPath = tripPath.startsWith("/") ? tripPath : `/${tripPath}`;
const tripBaseUrl = `${normalizedGatewayUrl}${normalizedTripPath}`;

function unwrapApiResponse(response) {
  return response?.data?.result;
}

export async function createTripApi(payload) {
  const response = await axiosClient.post(`${tripBaseUrl}/trip`, payload);
  return unwrapApiResponse(response);
}

export async function getAllTripsApi(params) {
  const response = await axiosClient.get(`${tripBaseUrl}/trip`, { params });
  return {
    items: response?.data?.result || [],
    count: response?.data?.count || 0,
  };
}
