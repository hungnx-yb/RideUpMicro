import axiosClient from "./axiosClient";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const locationPath = import.meta.env.VITE_LOCATION_SERVICE_PATH || "/api/location";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedLocationPath = locationPath.startsWith("/") ? locationPath : `/${locationPath}`;
const locationBaseUrl = `${normalizedGatewayUrl}${normalizedLocationPath}`;

export async function getAllProvinces(keyword = "") {
  const params = {};
  if (keyword) params.keyword = keyword;
  const res = await axiosClient.get(`${locationBaseUrl}/province`, { params });
  return res.data.result;
}

export async function getAllWards(provinceId, keyword = "") {
  if (!provinceId) return [];
  const params = { provinceId };
  if (keyword) params.keyword = keyword;
  const res = await axiosClient.get(`${locationBaseUrl}/ward`, { params });
  return res.data.result;
}
