import axiosClient from "./axiosClient";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const tripPath = import.meta.env.VITE_TRIP_SERVICE_PATH || "/api/trip";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedTripPath = tripPath.startsWith("/") ? tripPath : `/${tripPath}`;
const tripBaseUrl = `${normalizedGatewayUrl}${normalizedTripPath}`;

function unwrapApiResponse(response) {
  return response?.data?.result;
}

function unwrapCount(response) {
  return Number(response?.data?.count || 0);
}

export async function createRouteApi(payload) {
  const response = await axiosClient.post(`${tripBaseUrl}/route`, payload);
  return unwrapApiResponse(response);
}

export async function getRoutesApi(params) {
  const response = await axiosClient.get(`${tripBaseUrl}/route`, { params });
  return {
    items: unwrapApiResponse(response) || [],
    total: unwrapCount(response),
  };
}

export async function activateRouteApi(routeId, isActive) {
  const response = await axiosClient.patch(`${tripBaseUrl}/route/${routeId}/activate`, {
    isActive,
  });
  return unwrapApiResponse(response);
}

export async function getRouteDetailByStartAndEndApi(startProvinceId, endProvinceId) {
  if (!startProvinceId || !endProvinceId) return null;
  const response = await axiosClient.get(`${tripBaseUrl}/route/detail`, {
    params: { startProvinceId, endProvinceId },
  });
  return unwrapApiResponse(response);
}