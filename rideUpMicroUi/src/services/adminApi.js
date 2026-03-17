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
      const data = unwrapApiResponse(response) || [];
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

export async function getPendingDriversApi() {
  return getWithShortCache("/drivers/admin/pending");
}

export async function getPendingDriversCountApi(status = "PENDING") {
  const response = await axiosClient.get("/drivers/admin/count/pending-driver", {
    params: { status },
  });
  return Number(unwrapApiResponse(response) || 0);
}

export async function approveDriverApi(driverId) {
  const response = await axiosClient.post(`/drivers/admin/${driverId}/approve`);
  return unwrapApiResponse(response);
}

export async function rejectDriverApi(driverId, reason) {
  const response = await axiosClient.post(`/drivers/admin/${driverId}/reject`, null, {
    params: reason ? { reason } : undefined,
  });
  return unwrapApiResponse(response);
}

export async function getPendingVehiclesApi() {
  return getWithShortCache("/vehicles/admin/pending");
}

export async function getPendingVehiclesCountApi(isVerified = false) {
  const response = await axiosClient.get("/vehicles/admin/count/pending-driver", {
    params: { isVerified },
  });
  return Number(unwrapApiResponse(response) || 0);
}

export async function approveVehicleApi(vehicleId) {
  const response = await axiosClient.post(`/vehicles/admin/${vehicleId}/approve`);
  return unwrapApiResponse(response);
}

export async function rejectVehicleApi(vehicleId, reason) {
  const response = await axiosClient.post(`/vehicles/admin/${vehicleId}/reject`, null, {
    params: reason ? { reason } : undefined,
  });
  return unwrapApiResponse(response);
}
