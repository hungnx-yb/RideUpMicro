import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaCheckCircle,
  FaCreditCard,
  FaEnvelopeOpenText,
  FaEnvelope,
  FaMars,
  FaPhoneAlt,
  FaUserCheck,
  FaIdBadge,
  FaVenus,
  FaShieldAlt,
  FaSuitcase,
  FaUser,
} from "react-icons/fa";
import CustomerNavbar from "../components/CustomerNavbar";
import FloatingSupportMenu from "../components/FloatingSupportMenu";
import useAuth from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/authApi";
import { getMyBookingsApi } from "../services/bookingApi";
import { getMyUserInfoApi } from "../services/userApi";

function formatDate(isoString) {
  if (!isoString) {
    return "Chua cap nhat";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Chua cap nhat";
  }

  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "Chua cap nhat";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Chua cap nhat";
  }

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  });
}

function normalizeRoleValue(role) {
  if (!role) {
    return "";
  }

  if (typeof role === "string") {
    return role;
  }

  return role?.name || role?.code || String(role);
}

function normalizeUserProfile(userProfile) {
  if (!userProfile) {
    return null;
  }

  return {
    id: userProfile.id || "",
    fullName: userProfile.fullName || "",
    email: userProfile.email || "",
    phoneNumber: userProfile.phoneNumber || "",
    dateOfBirth: userProfile.dateOfBirth || "",
    gender: userProfile.gender || "",
    avatarUrl: userProfile.avatarUrl || "",
    verified: Boolean(userProfile.verified),
    createdAt: userProfile.createdAt || "",
    roles: Array.isArray(userProfile.roles) ? userProfile.roles.map(normalizeRoleValue).filter(Boolean) : [],
  };
}

function CustomerProfilePage() {
  const { user, roles, activeRole } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [profileErrorMessage, setProfileErrorMessage] = useState("");

  const fallbackProfile = useMemo(
    () => ({
      id: user?.id || "",
      fullName: user?.fullName || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      dateOfBirth: user?.dateOfBirth || "",
      gender: user?.gender || "",
      avatarUrl: user?.avatarUrl || "",
      verified: Boolean(user?.verified),
      createdAt: user?.createdAt || "",
      roles,
    }),
    [roles, user]
  );

  const resolvedProfile = userProfile || fallbackProfile;

  const displayName = resolvedProfile?.fullName?.trim() || resolvedProfile?.email || "RideUp User";
  const displayInitial = displayName.charAt(0).toUpperCase();

  const fetchUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      setProfileErrorMessage("");
      const response = await getMyUserInfoApi();
      setUserProfile(normalizeUserProfile(response));
    } catch (error) {
      setProfileErrorMessage(getApiErrorMessage(error, "Khong tai duoc thong tin tai khoan tu user service"));
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();

    const loadBookings = async () => {
      try {
        setIsLoading(true);
        const response = await getMyBookingsApi();
        setBookings(Array.isArray(response) ? response : []);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "Khong tai duoc thong ke chuyen"));
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, []);

  const resolvedRoles = useMemo(() => {
    return resolvedProfile?.roles?.length ? resolvedProfile.roles : roles;
  }, [resolvedProfile?.roles, roles]);

  const stats = useMemo(() => {
    const normalized = bookings.map((item) => String(item?.status || "").toUpperCase());

    return {
      total: normalized.length,
      pending: normalized.filter((status) => status === "PENDING_PAYMENT").length,
      confirmed: normalized.filter((status) => status === "RESERVED" || status === "CONFIRMED").length,
      canceled: normalized.filter((status) => status === "CANCELLED").length,
    };
  }, [bookings]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_100%_-20%,#dcfce7_0%,#f8fafc_38%,#f1f5f9_100%)]">
      <CustomerNavbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-900 p-5 text-white shadow-xl shadow-slate-900/20 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {resolvedProfile?.avatarUrl ? (
                <img
                  src={resolvedProfile.avatarUrl}
                  alt={displayName}
                  className="h-14 w-14 rounded-2xl border border-white/30 object-cover"
                />
              ) : (
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-bold text-white">
                  {displayInitial}
                </span>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Trang cá nhân</p>
                <h1 className="text-2xl font-extrabold sm:text-3xl">{displayName}</h1>
                <p className="mt-1 text-sm text-emerald-50/90">Quản lý tài khoản, thông tin đặt chuyến và bảo mật của bạn.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
              <p className="text-emerald-100/90">Vai trò hiện tại</p>
              <p className="text-base font-extrabold">{activeRole || "CUSTOMER"}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">Thông tin tài khoản</h2>

              {isLoadingProfile ? (
                <p className="mt-3 text-sm text-slate-500">Đang đồng bộ thông tin từ user service...</p>
              ) : null}

              {profileErrorMessage ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{profileErrorMessage}</p>
              ) : null}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Họ và tên</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FaUser className="text-emerald-600" />
                    {resolvedProfile?.fullName || "Chưa cập nhật"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 break-all">
                    <FaEnvelope className="text-emerald-600" />
                    {resolvedProfile?.email || "--"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">User ID</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 break-all">
                    <FaIdBadge className="text-emerald-600" />
                    {resolvedProfile?.id || "--"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Danh sách vai trò</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{resolvedRoles.length ? resolvedRoles.join(", ") : "CUSTOMER"}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Số điện thoại</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FaPhoneAlt className="text-emerald-600" />
                    {resolvedProfile?.phoneNumber || "Chưa cập nhật"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày sinh</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FaCalendarCheck className="text-emerald-600" />
                    {formatDate(resolvedProfile?.dateOfBirth)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giới tính</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    {String(resolvedProfile?.gender || "").toUpperCase() === "FEMALE" ? (
                      <FaVenus className="text-emerald-600" />
                    ) : (
                      <FaMars className="text-emerald-600" />
                    )}
                    {resolvedProfile?.gender || "Chưa cập nhật"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái tài khoản</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FaUserCheck className="text-emerald-600" />
                    {resolvedProfile?.verified ? "Đã xác minh" : "Chưa xác minh"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tham gia từ</p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <FaEnvelopeOpenText className="text-emerald-600" />
                    {formatDateTime(resolvedProfile?.createdAt)}
                  </p>
                </div>

              </div>
            </article>
          </div>

          <aside className="space-y-3.5">
            <article className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-3.5 shadow-sm">
              <h3 className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-emerald-800">
                <FaCalendarCheck />
                Thống kê đặt chuyến
              </h3>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-emerald-100 bg-white/80 px-3 py-2">
                  <p className="text-emerald-700/90">Tổng booking</p>
                  <p className="text-lg font-extrabold text-emerald-800">{isLoading ? "..." : stats.total}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-white/80 px-3 py-2">
                  <p className="text-amber-700/90">Chờ thanh toán</p>
                  <p className="text-lg font-extrabold text-amber-700">{isLoading ? "..." : stats.pending}</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-white/80 px-3 py-2">
                  <p className="text-sky-700/90">Đã đặt</p>
                  <p className="text-lg font-extrabold text-sky-700">{isLoading ? "..." : stats.confirmed}</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-white/80 px-3 py-2">
                  <p className="text-rose-700/90">Đã hủy</p>
                  <p className="text-lg font-extrabold text-rose-700">{isLoading ? "..." : stats.canceled}</p>
                </div>
              </div>

              {errorMessage ? (
                <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorMessage}</p>
              ) : null}
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-slate-100 shadow-sm">
              <h3 className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
                <FaShieldAlt className="text-emerald-300" />
                Bảo mật tài khoản
              </h3>
              <ul className="mt-2.5 space-y-2 text-sm text-slate-300">
                <li className="inline-flex items-start gap-2">
                  <FaCheckCircle className="mt-0.5 text-[11px] text-emerald-300" />
                  Đổi mật khẩu định kỳ 3-6 tháng một lần.
                </li>
                <li className="inline-flex items-start gap-2">
                  <FaCheckCircle className="mt-0.5 text-[11px] text-emerald-300" />
                  Kiểm tra email xác minh trước khi đặt chuyến.
                </li>
                <li className="inline-flex items-start gap-2">
                  <FaCreditCard className="mt-0.5 text-[11px] text-emerald-300" />
                  Chỉ thanh toán qua cổng chính thức của RideUp.
                </li>
              </ul>
            </article>
          </aside>
        </section>
      </main>

      <FloatingSupportMenu />
    </div>
  );
}

export default CustomerProfilePage;
