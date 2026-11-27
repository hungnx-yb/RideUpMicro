import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import AuthVerifyAccountPage from "../pages/AuthVerifyAccountPage";
import AdminRevenueAnalyticsPage from "../pages/admin/AdminRevenueAnalyticsPage";
import AdminCommissionConfigPage from "../pages/admin/AdminCommissionConfigPage";
import AdminTimeoutConfigPage from "../pages/admin/AdminTimeoutConfigPage";
import AdminBroadcastPage from "../pages/admin/AdminBroadcastPage";
import AdminFareBoundaryPage from "../pages/admin/AdminFareBoundaryPage";
import AdminDriverManagementPage from "../pages/admin/AdminDriverManagementPage";
import ProtectedRoute from "./ProtectedRoute";
import useAuth from "../hooks/useAuth";

function RootRedirect() {
  const { isAuthenticated, activeRole } = useAuth();
  if (isAuthenticated && activeRole === "ADMIN") {
    return <Navigate to="/admin/drivers" replace />;
  }
  return <Navigate to="/login" replace />;
}

function AppRouter() {
  return (
    <Routes>
      {/* Mở web là vào thẳng màn đăng nhập (hoặc trang Quản lý tài xế nếu đã đăng nhập) */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/login" element={<Navigate to="/login" replace />} />
      {/* Link xác thực tài khoản gửi qua email (người dùng app khách hàng / tài xế) */}
      <Route path="/auth/verify" element={<AuthVerifyAccountPage />} />

      {/* Tuyến đường quản trị được bảo vệ */}
      <Route element={<ProtectedRoute />}>
        {/* Bảng điều khiển đã bỏ: giữ đường dẫn cũ, chuyển sang trang Quản lý tài xế */}
        <Route path="/admin-dashboard" element={<Navigate to="/admin/drivers" replace />} />
        {/* Trang duyệt cũ đã gộp vào Quản lý tài xế: giữ đường dẫn cũ, chuyển hướng kèm bộ lọc chờ duyệt */}
        <Route path="/admin-dashboard/drivers-approval" element={<Navigate to="/admin/drivers?status=PENDING" replace />} />
        <Route path="/admin-dashboard/vehicles-approval" element={<Navigate to="/admin/drivers?vehicleStatus=PENDING" replace />} />
        <Route path="/admin/revenue-analytics" element={<AdminRevenueAnalyticsPage />} />
        <Route path="/admin/commission-config" element={<AdminCommissionConfigPage />} />
        <Route path="/admin/timeout-config" element={<AdminTimeoutConfigPage />} />
        <Route path="/admin/broadcast-push" element={<AdminBroadcastPage />} />
        <Route path="/admin/fare-boundary" element={<AdminFareBoundaryPage />} />
        <Route path="/admin/drivers" element={<AdminDriverManagementPage />} />
        <Route path="/dashboard" element={<Navigate to="/admin/drivers" replace />} />
      </Route>

      {/* Điều hướng các đường dẫn lạ về trang chính */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
