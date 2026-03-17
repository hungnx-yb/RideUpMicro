import axiosClient from "./axiosClient";

const shortLivedGetCache = new Map();
const SHORT_CACHE_TTL_MS = 1500;

function getAuthTokenForCache() {
  return localStorage.getItem("auth_token") || "";
}

async function getWithShortCache(url, ttlMs = SHORT_CACHE_TTL_MS) {
  const token = getAuthTokenForCache();
  const cacheKey = `${token}::${url}`;
  const now = Date.now();
  const cached = shortLivedGetCache.get(cacheKey);

  if (cached?.data !== undefined && cached.expiresAt > now) {
    return cached.data;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = axiosClient
    .get(url)
    .then((response) => {
      const data = unwrapApiResponse(response);
      shortLivedGetCache.set(cacheKey, {
        data,
        promise: null,
        expiresAt: Date.now() + ttlMs,
      });
      return data;
    })
    .catch((error) => {
      shortLivedGetCache.delete(cacheKey);
      throw error;
    });

  shortLivedGetCache.set(cacheKey, {
    data: undefined,
    promise,
    expiresAt: now + ttlMs,
  });

  return promise;
}

function unwrapApiResponse(response) {
  return response?.data?.result;
}

function appendIfPresent(formData, key, value) {
  if (value === null || value === undefined || value === "") {
    return;
  }

  formData.append(key, value);
}

export async function registerDriverApi(payload) {
  const formData = new FormData();

  appendIfPresent(formData, "cccd", payload.cccd);
  appendIfPresent(formData, "cccdImageFront", payload.cccdImageFront);
  appendIfPresent(formData, "cccdImageBack", payload.cccdImageBack);
  appendIfPresent(formData, "gplx", payload.gplx);
  appendIfPresent(formData, "gplxExpiryDate", payload.gplxExpiryDate);
  appendIfPresent(formData, "gplxImage", payload.gplxImage);

  const response = await axiosClient.post("/drivers/register", formData);
  return unwrapApiResponse(response);
}

export async function updateDriverProfileApi(payload) {
  const formData = new FormData();

  appendIfPresent(formData, "cccd", payload.cccd);
  appendIfPresent(formData, "cccdImageFront", payload.cccdImageFront);
  appendIfPresent(formData, "cccdImageBack", payload.cccdImageBack);
  appendIfPresent(formData, "gplx", payload.gplx);
  appendIfPresent(formData, "gplxExpiryDate", payload.gplxExpiryDate);
  appendIfPresent(formData, "gplxImage", payload.gplxImage);

  const response = await axiosClient.put("/drivers/me", formData);
  return unwrapApiResponse(response);
}

export async function getMyDriverProfileApi() {
  return getWithShortCache("/drivers/me");
}

export async function getMyDriverStatusApi() {
  const response = await axiosClient.get("/drivers/me/status");
  return unwrapApiResponse(response);
}

export async function getMyVehicleStatusApi() {
  const response = await axiosClient.get("/vehicles/me/status");
  return unwrapApiResponse(response);
}

export async function getMyVehicleApi() {
  return getWithShortCache("/vehicles/me");
}

export async function registerVehicleApi(payload) {
  const formData = new FormData();

  appendIfPresent(formData, "plateNumber", payload.plateNumber);
  appendIfPresent(formData, "vehicleBrand", payload.vehicleBrand);
  appendIfPresent(formData, "vehicleModel", payload.vehicleModel);
  appendIfPresent(formData, "vehicleYear", payload.vehicleYear);
  appendIfPresent(formData, "vehicleColor", payload.vehicleColor);
  appendIfPresent(formData, "seatCapacity", payload.seatCapacity);
  appendIfPresent(formData, "vehicleType", payload.vehicleType);
  appendIfPresent(formData, "vehicleImage", payload.vehicleImage);
  appendIfPresent(formData, "registrationImage", payload.registrationImage);
  appendIfPresent(formData, "registrationExpiryDate", payload.registrationExpiryDate);
  appendIfPresent(formData, "insuranceImage", payload.insuranceImage);
  appendIfPresent(formData, "insuranceExpiryDate", payload.insuranceExpiryDate);

  const response = await axiosClient.post("/vehicles", formData);
  return unwrapApiResponse(response);
}
