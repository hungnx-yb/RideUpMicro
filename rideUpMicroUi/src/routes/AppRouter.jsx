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
import AdminRouteManagementPage from "../pages/AdminRouteManagementPage";
import AuthVerifyNoticePage from "../pages/AuthVerifyNoticePage";
import AuthVerifyAccountPage from "../pages/AuthVerifyAccountPage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import DriverOnboardingPage from "../pages/DriverOnboardingPage";
import PaymentVnpayResultPage from "../pages/PaymentVnpayResultPage";
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
        <Route
          path="/admin-dashboard/routes"
          element={(
            <AdminOnlyRoute>
              <AdminRouteManagementPage />
            </AdminOnlyRoute>
          )}
        />
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
        <Route path="/driver/onboarding" element={<DriverOnboardingPage />} />
        <Route path="/auth/change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
