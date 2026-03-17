import axiosClient from "./axiosClient";

export function getDashboardSummary() {
  return axiosClient.get("/dashboard/summary");
}
