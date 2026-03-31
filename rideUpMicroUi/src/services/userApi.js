import axiosClient from "./axiosClient";

function unwrapApiResponse(response) {
  return response?.data?.result;
}

export async function getMyUserInfoApi() {
  const response = await axiosClient.get("/users/me");
  return unwrapApiResponse(response);
}

export async function getUserInfoByIdApi(userId) {
  const response = await axiosClient.get(`/users/${userId}`);
  return unwrapApiResponse(response);
}

export async function updateMyUserInfoApi(payload) {
  const response = await axiosClient.put("/users/me", payload);
  return unwrapApiResponse(response);
}
