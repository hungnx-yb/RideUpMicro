import axios from "axios";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const identityPath = import.meta.env.VITE_IDENTITY_SERVICE_PATH || "/api/identity";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedIdentityPath = identityPath.startsWith("/") ? identityPath : `/${identityPath}`;
const composedBaseUrl = `${normalizedGatewayUrl}${normalizedIdentityPath}`;
const baseURL = import.meta.env.VITE_API_BASE_URL || composedBaseUrl;
const timeoutFromEnv = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const requestTimeout = Number.isFinite(timeoutFromEnv) && timeoutFromEnv >= 0 ? timeoutFromEnv : 0;

function shouldAttachAuthHeader(config) {
  const requestUrl = `${config.baseURL || ""}${config.url || ""}`.toLowerCase();
  if (config.skipAuth) {
    return false;
  }

  // Auth endpoints should not receive bearer token from local storage.
  return !requestUrl.includes("/auth/");
}

function isUsableToken(token) {
  if (!token) {
    return false;
  }

  const normalizedToken = token.trim().toLowerCase();
  return normalizedToken !== "null" && normalizedToken !== "undefined";
}

const axiosClient = axios.create({
  baseURL,
  // 0 means no timeout; useful when debugging backend with breakpoints.
  timeout: requestTimeout,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (shouldAttachAuthHeader(config) && isUsableToken(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosClient;
