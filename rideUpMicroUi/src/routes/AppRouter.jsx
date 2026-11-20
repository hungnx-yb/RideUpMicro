import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import SearchTripPage from "../pages/SearchTripPage";
import MyTripsPage from "../pages/MyTripsPage";
import CustomerProfilePage from "../pages/CustomerProfilePage";
import DriverDashboardPage from "../pages/DriverDashboardPage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminDriverApprovalPage from "../pages/AdminDriverApprovalPage";
import AdminVehicleApprovalPage from "../pages/AdminVehicleApprovalPage";
import AdminCommissionConfigPage from "../pages/admin/AdminCommissionConfigPage";
import AdminRevenueAnalyticsPage from "../pages/admin/AdminRevenueAnalyticsPage";
import AdminTimeoutConfigPage from "../pages/admin/AdminTimeoutConfigPage";
import AdminBroadcastPage from "../pages/admin/AdminBroadcastPage";
import AdminFareBoundaryPage from "../pages/admin/AdminFareBoundaryPage";
import AdminAuditLogsPage from "../pages/admin/AdminAuditLogsPage";

// ADM-FEAT-01 → 06: các trang quản trị mở rộng
const ADMIN_FEATURE_ROUTES = [
  { path: "/admin/commission-config", element: <AdminCommissionConfigPage /> },
  { path: "/admin/revenue-analytics", element: <AdminRevenueAnalyticsPage /> },
  { path: "/admin/timeout-config", element: <AdminTimeoutConfigPage /> },
  { path: "/admin/broadcast-push", element: <AdminBroadcastPage /> },
  { path: "/admin/fare-boundary", element: <AdminFareBoundaryPage /> },
  { path: "/admin/audit-logs", element: <AdminAuditLogsPage /> },
];
import AuthVerifyNoticePage from "../pages/AuthVerifyNoticePage";
import AuthVerifyAccountPage from "../pages/AuthVerifyAccountPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import DriverOnboardingPage from "../pages/DriverOnboardingPage";
import PaymentVnpayResultPage from "../pages/PaymentVnpayResultPage";
import NotificationsPage from "../pages/NotificationsPage";
import BookingChatPage from "../pages/chat/BookingChatPage";
import DriverTripsPage from "../pages/driver/DriverTripsPage";
import ProtectedRoute from "./ProtectedRoute";
import useAuth from "../hooks/useAuth";
import { getMyDriverProfileApi, getMyVehicleApi } from "../services/driverOnboardingApi";

function DriverAccessWrapper({ children }) {
  const { activeRole } = useAuth();
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [canAccessDriverDashboard, setCanAccessDriverDashboard] = useState(false);

  const getErrorCode = (error) =>
    error?.response?.data?.code ?? error?.response?.data?.error?.code ?? null;

  useEffect(() => {
    let isMounted = true;

    if (activeRole !== "DRIVER") {
      setIsCheckingStatus(false);
      setCanAccessDriverDashboard(false);
      return () => {
        isMounted = false;
      };
    }

    const fetchDriverStatus = async () => {
      try {
        setIsCheckingStatus(true);
        const driverProfile = await getMyDriverProfileApi();
        const isDriverApproved = driverProfile?.status === "APPROVED";

        if (!isDriverApproved) {
          if (isMounted) {
            setCanAccessDriverDashboard(false);
          }
          return;
        }

        const vehicle = await getMyVehicleApi();
        const isVehicleApproved = vehicle?.isVerified === true && vehicle?.isActive === true;

        if (isMounted) {
          setCanAccessDriverDashboard(isVehicleApproved);
        }
      } catch (error) {
        const code = getErrorCode(error);
        if (isMounted) {
          if (code === 2002 || code === 3002) {
            setCanAccessDriverDashboard(false);
            return;
          }
          setCanAccessDriverDashboard(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingStatus(false);
        }
      }
    };

    fetchDriverStatus();

    return () => {
      isMounted = false;
    };
  }, [activeRole]);

  if (activeRole !== "DRIVER") {
    return <Navigate to="/trips/search" replace />;
  }

  if (isCheckingStatus) {
    return <div className="p-6 text-sm text-slate-600">Đang kiểm tra trạng thái duyệt tài xế và xe...</div>;
  }

  if (!canAccessDriverDashboard) {
    return <Navigate to="/driver/onboarding" replace />;
  }

  return children;
}

function DashboardRouteByRole() {
  const { activeRole } = useAuth();

  if (activeRole === "DRIVER") {
    return <Navigate to="/driver-dashboard" replace />;
  }

  if (activeRole === "ADMIN") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <SearchTripPage />;
}

function DriverOnlyRoute() {
  return (
    <DriverAccessWrapper>
      <DriverDashboardPage />
    </DriverAccessWrapper>
  );
}

function CustomerOnlyRoute({ children }) {
  const { activeRole } = useAuth();

  if (activeRole === "DRIVER") {
    return <Navigate to="/driver-dashboard" replace />;
  }

  if (activeRole === "ADMIN") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children || <SearchTripPage />;
}

function AdminOnlyRoute({ children }) {
  const { activeRole } = useAuth();

  if (activeRole !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/verify-notice" element={<AuthVerifyNoticePage />} />
      <Route path="/auth/verify" element={<AuthVerifyAccountPage />} />
      <Route path="/payments/vnpay-result" element={<PaymentVnpayResultPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardRouteByRole />} />
        <Route path="/driver-dashboard" element={<DriverOnlyRoute />} />
        <Route
          path="/driver/trips"
          element={(
            <DriverAccessWrapper>
              <DriverTripsPage />
            </DriverAccessWrapper>
          )}
        />
        <Route
          path="/driver/notifications"
          element={(
            <DriverAccessWrapper>
              <NotificationsPage />
            </DriverAccessWrapper>
          )}
        />
        <Route
          path="/admin-dashboard"
          element={(
            <AdminOnlyRoute>
              <AdminDashboardPage />
            </AdminOnlyRoute>
          )}
        />
        <Route
          path="/admin-dashboard/drivers-approval"
          element={(
            <AdminOnlyRoute>
              <AdminDriverApprovalPage />
            </AdminOnlyRoute>
          )}
        />
        <Route
          path="/admin-dashboard/vehicles-approval"
          element={(
            <AdminOnlyRoute>
              <AdminVehicleApprovalPage />
            </AdminOnlyRoute>
          )}
        />
        {ADMIN_FEATURE_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<AdminOnlyRoute>{route.element}</AdminOnlyRoute>}
          />
        ))}
        <Route path="/trips/search" element={<CustomerOnlyRoute />} />
        <Route
          path="/profile"
          element={(
            <CustomerOnlyRoute>
              <CustomerProfilePage />
            </CustomerOnlyRoute>
          )}
        />
        <Route
          path="/trips/my"
          element={(
            <CustomerOnlyRoute>
              <MyTripsPage />
            </CustomerOnlyRoute>
          )}
        />
        <Route
          path="/notifications"
          element={(
            <CustomerOnlyRoute>
              <NotificationsPage />
            </CustomerOnlyRoute>
          )}
        />
        <Route path="/driver/onboarding" element={<DriverOnboardingPage />} />
        <Route path="/chat/:bookingId" element={<BookingChatPage />} />
        <Route path="/auth/change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
