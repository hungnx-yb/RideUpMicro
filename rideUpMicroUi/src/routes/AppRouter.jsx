import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminDriverApprovalPage from "../pages/admin/AdminDriverApprovalPage";
import AdminVehicleApprovalPage from "../pages/admin/AdminVehicleApprovalPage";
import AdminRevenueAnalyticsPage from "../pages/admin/AdminRevenueAnalyticsPage";
import AdminCommissionConfigPage from "../pages/admin/AdminCommissionConfigPage";
import AdminTimeoutConfigPage from "../pages/admin/AdminTimeoutConfigPage";
import AdminBroadcastPage from "../pages/admin/AdminBroadcastPage";
import AdminFareBoundaryPage from "../pages/admin/AdminFareBoundaryPage";
import ProtectedRoute from "./ProtectedRoute";
import useAuth from "../hooks/useAuth";

function RootRedirect() {
  const { isAuthenticated, activeRole } = useAuth();
  if (isAuthenticated && activeRole === "ADMIN") {
    return <Navigate to="/admin-dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

function AppRouter() {
  return (
    <Routes>
      {/* Mở web là vào thẳng màn đăng nhập (hoặc dashboard nếu đã đăng nhập) */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/login" element={<Navigate to="/login" replace />} />

      {/* Tuyến đường quản trị được bảo vệ */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin-dashboard/drivers-approval" element={<AdminDriverApprovalPage />} />
        <Route path="/admin-dashboard/vehicles-approval" element={<AdminVehicleApprovalPage />} />
        <Route path="/admin/revenue-analytics" element={<AdminRevenueAnalyticsPage />} />
        <Route path="/admin/commission-config" element={<AdminCommissionConfigPage />} />
        <Route path="/admin/timeout-config" element={<AdminTimeoutConfigPage />} />
        <Route path="/admin/broadcast-push" element={<AdminBroadcastPage />} />
        <Route path="/admin/fare-boundary" element={<AdminFareBoundaryPage />} />
        <Route path="/dashboard" element={<Navigate to="/admin-dashboard" replace />} />
      </Route>

      {/* Điều hướng các đường dẫn lạ về trang chính */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
