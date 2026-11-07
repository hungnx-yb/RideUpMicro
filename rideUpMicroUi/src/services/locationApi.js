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

export async function getWardById(wardId) {
  if (!wardId) return null;
  const res = await axiosClient.get(`${locationBaseUrl}/ward/${wardId}`);
  return res.data.result;
}

export async function getMaxDistanceConfigApi(provinceId) {
  const params = provinceId ? { provinceId } : {};
  const res = await axiosClient.get(`${locationBaseUrl}/config/max-distance`, { params });
  return res.data.result;
}

export async function getLocationDistanceConfigsApi() {
  const res = await axiosClient.get(`${locationBaseUrl}/admin/distance-configs`);
  return res.data.result;
}

export async function createLocationDistanceConfigApi(payload) {
  const res = await axiosClient.post(`${locationBaseUrl}/admin/distance-configs`, payload);
  return res.data.result;
}

export async function updateLocationDistanceConfigApi(id, payload) {
  const res = await axiosClient.put(`${locationBaseUrl}/admin/distance-configs/${id}`, payload);
  return res.data.result;
}

export async function deleteLocationDistanceConfigApi(id) {
  const res = await axiosClient.delete(`${locationBaseUrl}/admin/distance-configs/${id}`);
  return res.data.result;
}
