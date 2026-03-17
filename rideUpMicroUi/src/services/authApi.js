import axiosClient from "./axiosClient";

function unwrapApiResponse(response) {
  return response?.data?.result;
}

export function getApiErrorMessage(error, fallback = "Có lỗi xảy ra, vui lòng thử lại") {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.code === "ECONNABORTED") {
    return "Yêu cầu quá thời gian chờ. Vui lòng thử lại.";
  }

  if (error?.message === "Network Error") {
    return "Không kết nối được tới API Gateway. Kiểm tra CORS và địa chỉ gateway.";
  }

  return fallback;
}

export async function loginApi(payload) {
  const response = await axiosClient.post("/auth/authentication", payload);
  return unwrapApiResponse(response);
}

export async function registerApi(payload) {
  const response = await axiosClient.post("/auth/register", payload);
  return unwrapApiResponse(response);
}

export async function verifyAccountApi(token) {
  const response = await axiosClient.get("/auth/verification", {
    params: { token },
  });
  return response?.data;
}

export async function logoutApi(payload) {
  const response = await axiosClient.post("/auth/logout", payload);
  return response?.data;
}

export async function refreshTokenApi(refreshToken) {
  const response = await axiosClient.post("/auth/refresh-token", { refreshToken });
  return unwrapApiResponse(response);
}

export async function requestOtpApi(password) {
  const response = await axiosClient.post("/auth/request-otp", { password });
  return response?.data;
}

export async function changePasswordApi(payload) {
  const response = await axiosClient.post("/auth/change-password", payload);
  return response?.data;
}
