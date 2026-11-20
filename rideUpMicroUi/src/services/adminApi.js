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

export async function getCommissionConfigApi() {
  const response = await axiosClient.get("/admin/commission-config");
  return unwrapApiResponse(response);
}

export async function updateCommissionConfigApi(payload) {
  const response = await axiosClient.put("/admin/commission-config", payload);
  return unwrapApiResponse(response);
}

// =====================================================================
// PHÂN HỆ QUẢN TRỊ MỞ RỘNG (ADM-FEAT-01 → ADM-FEAT-06)
// =====================================================================
const adminGatewayUrl = (import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080").replace(/\/$/, "");

function serviceUrl(envPath, defaultPath) {
  const path = envPath || defaultPath;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Tương thích truy cập qua IP LAN giống axiosClient
  let base = adminGatewayUrl;
  if (typeof window !== "undefined" && window.location.hostname
    && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    base = base.replace("localhost", window.location.hostname).replace("127.0.0.1", window.location.hostname);
  }
  return `${base}${normalizedPath}`;
}

const bookingAdminBase = serviceUrl(import.meta.env.VITE_BOOKING_SERVICE_PATH, "/api/booking");
const tripAdminBase = serviceUrl(import.meta.env.VITE_TRIP_SERVICE_PATH, "/api/trip");
const notificationAdminBase = serviceUrl(import.meta.env.VITE_NOTIFICATION_SERVICE_PATH, "/api/notification");

// ---------- ADM-FEAT-01 & 02: Công nợ / tài chính (identity-service) ----------
export async function getFinanceSummaryApi(params) {
  const response = await axiosClient.get("/admin/finance/summary", { params });
  return unwrapApiResponse(response);
}

export async function getDriverDebtsApi({ keyword, status } = {}) {
  const response = await axiosClient.get("/admin/finance/driver-debts", {
    params: { keyword: keyword || undefined, status: status || "ALL" },
  });
  return unwrapApiResponse(response) || [];
}

export async function getDriverDebtTransactionsApi(driverUserId) {
  const response = await axiosClient.get(`/admin/finance/driver-debts/${driverUserId}/transactions`);
  return unwrapApiResponse(response) || [];
}

// ---------- ADM-FEAT-02: Doanh thu (booking-service) ----------
export async function getRevenueKpisApi({ fromDate, toDate, paymentMethod } = {}) {
  const response = await axiosClient.get(`${bookingAdminBase}/admin/analytics/revenue-kpis`, {
    params: { fromDate, toDate, paymentMethod: paymentMethod || "ALL" },
  });
  return unwrapApiResponse(response);
}

export async function exportRevenueExcelApi({ fromDate, toDate, paymentMethod } = {}) {
  const response = await axiosClient.get(`${bookingAdminBase}/admin/analytics/export-revenue`, {
    params: { fromDate, toDate, paymentMethod: paymentMethod || "ALL" },
    responseType: "blob",
  });
  return response.data;
}

// ---------- ADM-FEAT-03: Timeout SLA (booking-service) ----------
export async function getSystemTimeoutsApi() {
  const response = await axiosClient.get(`${bookingAdminBase}/admin/system-timeouts`);
  return unwrapApiResponse(response) || [];
}

export async function updateSystemTimeoutApi(configKey, valueMinutes) {
  const response = await axiosClient.put(`${bookingAdminBase}/admin/system-timeouts/${configKey}`, { valueMinutes });
  return unwrapApiResponse(response);
}

export async function updateAllSystemTimeoutsApi(items) {
  const response = await axiosClient.put(`${bookingAdminBase}/admin/system-timeouts`, items);
  return unwrapApiResponse(response) || [];
}

export async function resetSystemTimeoutApi(configKey) {
  const response = await axiosClient.post(`${bookingAdminBase}/admin/system-timeouts/${configKey}/reset`);
  return unwrapApiResponse(response);
}

// ---------- ADM-FEAT-04: Phát sóng thông báo (notification-service) ----------
export async function previewBroadcastAudienceApi(filter) {
  const response = await axiosClient.post(`${notificationAdminBase}/admin/broadcasts/audience-preview`, filter);
  return unwrapApiResponse(response);
}

export async function saveBroadcastDraftApi(payload) {
  const response = await axiosClient.post(`${notificationAdminBase}/admin/broadcasts/drafts`, payload);
  return unwrapApiResponse(response);
}

export async function sendBroadcastApi(payload) {
  const response = await axiosClient.post(`${notificationAdminBase}/admin/broadcasts/send-now`, payload);
  return unwrapApiResponse(response);
}

export async function getBroadcastCampaignsApi() {
  const response = await axiosClient.get(`${notificationAdminBase}/admin/broadcasts`);
  return unwrapApiResponse(response) || [];
}

// ---------- ADM-FEAT-05: Khung giá cước (trip-service) ----------
export async function getFareBoundaryApi() {
  const response = await axiosClient.get(`${tripAdminBase}/admin/fare-boundaries`);
  return unwrapApiResponse(response);
}

export async function updateFareBoundaryApi(payload) {
  const response = await axiosClient.put(`${tripAdminBase}/admin/fare-boundaries`, payload);
  return unwrapApiResponse(response);
}

export async function estimateFareApi(startProvinceId, endProvinceId) {
  const response = await axiosClient.get(`${tripAdminBase}/fare-boundaries/estimate`, {
    params: { startProvinceId, endProvinceId },
  });
  return unwrapApiResponse(response);
}

// ---------- ADM-FEAT-06: Nhật ký kiểm toán (identity-service) ----------
export async function getAuditLogsApi(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
  const response = await axiosClient.get("/admin/audit-logs", { params: cleaned });
  return unwrapApiResponse(response);
}
