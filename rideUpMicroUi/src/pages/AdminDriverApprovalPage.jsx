import { useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaChartBar,
  FaChevronDown,
  FaCheckCircle,
  FaClock,
  FaComments,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaIdBadge,
  FaPhoneAlt,
  FaRegChartBar,
  FaSignOutAlt,
  FaTaxi,
  FaTimes,
  FaTimesCircle,
  FaUser,
  FaUserCheck,
  FaUserCircle,
  FaUserFriends,
  FaUserShield,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  approveDriverApi,
  getPendingDriversApi,
  rejectDriverApi,
} from "../services/adminApi";
import { getApiErrorMessage } from "../services/authApi";
import { resolveImageUrl } from "../utils/imageUrl";

const topMenus = [
  { label: "Thống kê", icon: FaRegChartBar, active: false, path: "/admin-dashboard" },
  { label: "Phân tích", icon: FaChartBar, active: false },
  { label: "Người dùng", icon: FaUserFriends, active: true, path: "/admin-dashboard/drivers-approval" },
  { label: "Hỗ trợ", icon: FaComments, active: false },
];

function AdminDriverApprovalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processedDriverCount, setProcessedDriverCount] = useState({ approved: 0, rejected: 0 });
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [rejectingDriver, setRejectingDriver] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);

  const adminName = user?.fullName?.trim() || user?.email || "Quản trị viên";
  const adminInitial = adminName.charAt(0).toUpperCase();

  const getDriverName = (driver) =>
    driver?.fullName || driver?.user?.fullName || driver?.email || driver?.user?.email || "Tài xế mới";

  const getDriverEmail = (driver) =>
    driver?.email || driver?.user?.email || "Chưa cập nhật";

  const getDriverPhone = (driver) =>
    driver?.phoneNumber || driver?.phone || driver?.user?.phoneNumber || driver?.user?.phone || "Chưa cập nhật";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/auth/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  const loadDrivers = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const data = await getPendingDriversApi();
      setPendingDrivers(data || []);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải được danh sách tài xế chờ duyệt"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedDriver(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleApproveDriver = async (driver) => {
    try {
      setActionLoadingId(driver.id);
      setErrorMessage("");
      await approveDriverApi(driver.id);
      setProcessedDriverCount((previous) => ({ ...previous, approved: previous.approved + 1 }));
      setSuccessMessage("Đã duyệt hồ sơ tài xế thành công.");
      await loadDrivers();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Duyệt tài xế thất bại"));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleOpenRejectModal = (driver) => {
    setRejectingDriver(driver);
    setRejectionReason("Ảnh CCCD hoặc Giấy phép lái xe bị mờ, không đọc được thông tin.");
  };

  const handleCloseRejectModal = () => {
    setRejectingDriver(null);
    setRejectionReason("");
  };

  const handleConfirmRejectDriver = async () => {
    if (!rejectingDriver) return;
    const finalReason = rejectionReason.trim() || "Hồ sơ không đáp ứng tiêu chuẩn xét duyệt của hệ thống.";

    try {
      setActionLoadingId(rejectingDriver.id);
      setErrorMessage("");
      await rejectDriverApi(rejectingDriver.id, finalReason);
      setProcessedDriverCount((previous) => ({ ...previous, rejected: previous.rejected + 1 }));
      setSuccessMessage("Đã từ chối hồ sơ tài xế thành công.");
      handleCloseRejectModal();
      if (selectedDriver?.id === rejectingDriver.id) {
        closeQuickView();
      }
      await loadDrivers();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Từ chối tài xế thất bại"));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRejectDriver = (driver) => {
    handleOpenRejectModal(driver);
  };

  const openQuickView = (driver) => {
    setSelectedDriver(driver);
  };

  const closeQuickView = () => {
    setSelectedDriver(null);
  };

  const handleApproveFromModal = async () => {
    if (!selectedDriver) {
      return;
    }

    await handleApproveDriver(selectedDriver);
    closeQuickView();
  };

  const handleRejectFromModal = () => {
    if (!selectedDriver) {
      return;
    }
    handleOpenRejectModal(selectedDriver);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)]">
      <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-64 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-red-300/10 blur-3xl" />
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <FaTaxi />
              </span>
              <p className="text-3xl font-extrabold tracking-tight text-slate-800">
                Ride<span className="text-orange-500">Up</span>
              </p>
            </div>

            <nav className="hidden items-center gap-2 xl:flex">
              {topMenus.map((menu) => {
                const Icon = menu.icon;

                return (
                  <button
                    key={menu.label}
                    type="button"
                    onClick={() => menu.path && navigate(menu.path)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-base font-semibold ${
                      menu.active
                        ? "bg-orange-50 text-orange-600"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="text-sm" />
                    {menu.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="relative flex items-center gap-3" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm hover:border-orange-300"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-400 text-xl font-bold text-white">
                {adminInitial}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-xl font-bold leading-tight text-slate-800">{adminName}</span>
                <span className="block text-sm font-semibold text-orange-500">Quản trị viên</span>
              </span>
              <FaChevronDown className={`ml-2 text-slate-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} size={16} />
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Chức năng
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/dashboard");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FaUser size={14} />
                  Thông tin tài khoản
                </button>
                <div className="my-2 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
                >
                  <FaSignOutAlt size={15} />
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin-dashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-white"
          >
            <FaArrowLeft /> Quay lại Dashboard
          </button>
        </div>

        <section className="relative mt-4 overflow-hidden rounded-3xl border border-orange-200/70 bg-[linear-gradient(125deg,#f97316_0%,#fb923c_45%,#ef4444_100%)] px-6 py-7 text-white shadow-xl shadow-orange-500/25">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/25" />
          <div className="pointer-events-none absolute bottom-0 right-24 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h1 className="inline-flex items-center gap-3 text-3xl font-extrabold tracking-tight">
                <FaUserShield /> Duyệt tài khoản tài xế
              </h1>
              <p className="mt-2 text-sm font-medium text-orange-50 sm:text-base">
                Kiểm tra thông tin tài xế trước khi kích hoạt quyền chạy xe trong hệ thống.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-50">
                Ưu tiên xác minh giấy tờ
              </span>
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-50">
                SLA dưới 24h
              </span>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-amber-200/80 bg-white/95 px-4 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
              <FaClock /> Chờ duyệt
            </p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{pendingDrivers.length}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Cần xử lý trong phiên hiện tại</p>
          </article>
          <article className="rounded-2xl border border-emerald-200/80 bg-white/95 px-4 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <FaCheckCircle /> Đã phê duyệt
            </p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{processedDriverCount.approved}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Tổng hồ sơ đã thông qua</p>
          </article>
          <article className="rounded-2xl border border-red-200/80 bg-white/95 px-4 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
              <FaTimesCircle /> Đã từ chối
            </p>
            <p className="mt-1 text-3xl font-extrabold text-slate-900">{processedDriverCount.rejected}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Tổng hồ sơ chưa đạt yêu cầu</p>
          </article>
        </div>

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaExclamationTriangle /> Có lỗi xảy ra
            </p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-6 text-sm text-blue-700">
            Đang tải danh sách tài xế chờ duyệt...
          </div>
        ) : !pendingDrivers.length ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600">
            Không có tài xế nào đang chờ duyệt.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {pendingDrivers.map((driver) => {
              const isActing = actionLoadingId === driver.id;
              const name = getDriverName(driver);
              const phone = getDriverPhone(driver);
              const email = getDriverEmail(driver);
              const createdAtText = driver?.createdAt
                ? new Date(driver.createdAt).toLocaleString("vi-VN")
                : "Mới đăng ký";
              const displayInitial = name.charAt(0).toUpperCase();

              return (
                <article key={driver.id} className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/60">
                  <div className="grid gap-4 xl:grid-cols-[minmax(240px,1.2fr)_minmax(260px,1fr)_auto] xl:items-center">
                    <div className="flex min-w-[240px] flex-1 items-start gap-3">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 text-lg font-bold text-orange-700">
                        {displayInitial}
                      </span>
                      <div>
                        <p className="text-xl font-bold text-slate-900">{name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                            <FaUserCircle className="text-[11px]" /> Mới đăng ký
                          </p>
                          {driver?.isFaceEnrolled ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                              <FaCheckCircle className="text-[10px]" /> eKYC AI: Đã quét mặt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                              <FaExclamationTriangle className="text-[10px]" /> eKYC AI: Chưa đăng ký
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-600 sm:grid-cols-2">
                      <p className="inline-flex items-center gap-2">
                        <FaPhoneAlt className="text-xs text-orange-500" /> {phone}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <FaIdBadge className="text-xs text-orange-500" /> CCCD: {driver?.cccd || "-"}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <FaIdBadge className="text-xs text-orange-500" /> GPLX: {driver?.gplx || "-"} {driver?.gplxClasses?.length ? `(${driver.gplxClasses.join(",")})` : ""}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <FaTaxi className="text-xs text-orange-500" /> Xe: {driver?.plateNumber ? `${driver.plateNumber} (${driver?.vehicleBrand || ""})` : "Chưa đăng ký xe"}
                      </p>
                      <p className="inline-flex items-center gap-2 sm:col-span-2">
                        <FaCalendarAlt className="text-xs text-orange-500" /> Đăng ký: {createdAtText}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => openQuickView(driver)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 transition hover:border-orange-300 hover:bg-orange-50"
                        title="Xem nhanh"
                      >
                        <FaEye className="text-sm" />
                      </button>

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleApproveDriver(driver)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-60"
                      >
                        <FaCheckCircle className="text-xs" /> Phê duyệt
                      </button>

                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleRejectDriver(driver)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-600 disabled:opacity-60"
                      >
                        <FaTimesCircle className="text-xs" /> Từ chối
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedDriver ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 py-6 backdrop-blur-[2px]"
            onClick={closeQuickView}
          >
            <div
              className="w-full max-w-4xl rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-900">
                  <FaEye className="text-orange-500" /> Chi tiết tài xế
                </h3>
                <button
                  type="button"
                  onClick={closeQuickView}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-500 to-red-500 px-5 py-4 text-white shadow-lg shadow-orange-500/20">
                <p className="text-xl font-extrabold">{getDriverName(selectedDriver)}</p>
                <p className="mt-1 text-sm text-orange-50">Mã hồ sơ: {selectedDriver?.id || "-"}</p>
              </div>

              <div className="mt-4 grid max-h-[58vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Thông tin cá nhân</h4>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaUser className="text-orange-500" />
                      {getDriverName(selectedDriver)}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaEnvelope className="text-orange-500" />
                      {getDriverEmail(selectedDriver)}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaPhoneAlt className="text-orange-500" />
                      {getDriverPhone(selectedDriver)}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaCalendarAlt className="text-orange-500" />
                      Ngày tạo: {selectedDriver?.createdAt ? new Date(selectedDriver.createdAt).toLocaleString("vi-VN") : "-"}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Hồ sơ tài xế</h4>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaIdBadge className="text-orange-500" />
                      CCCD: {selectedDriver?.cccd || "Chưa cập nhật"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaIdBadge className="text-orange-500" />
                      GPLX: {selectedDriver?.gplx || "Chưa cập nhật"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaIdBadge className="text-orange-500" />
                      Hạng GPLX:{" "}
                      {selectedDriver?.gplxClasses && selectedDriver.gplxClasses.length > 0 ? (
                        <span className="font-semibold text-slate-900">
                          {selectedDriver.gplxClasses.join(", ")}
                        </span>
                      ) : (
                        <span className="text-slate-400">Chưa cập nhật</span>
                      )}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaCalendarAlt className="text-orange-500" />
                      Ngày cấp GPLX: {selectedDriver?.gplxIssueDate || "Chưa cập nhật"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaCalendarAlt className="text-orange-500" />
                      Hết hạn GPLX: {selectedDriver?.gplxExpiryDate || "Không thời hạn"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaIdBadge className="text-orange-500" />
                      Nơi cấp GPLX: {selectedDriver?.gplxIssuePlace || "Chưa cập nhật"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaUserShield className="text-orange-500" />
                      Trạng thái: {selectedDriver?.status || "PENDING"}
                    </p>
                  </div>
                </section>

                {/* THÔNG TIN PHƯƠNG TIỆN */}
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Thông tin phương tiện đăng ký</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaTaxi className="text-orange-500" />
                      Biển số xe:{" "}
                      <span className="font-bold text-slate-900">
                        {selectedDriver?.plateNumber || "Chưa cập nhật"}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaTaxi className="text-orange-500" />
                      Hãng & Dòng xe:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedDriver?.vehicleBrand || "-"} {selectedDriver?.vehicleModel || ""}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaTaxi className="text-orange-500" />
                      Màu xe: {selectedDriver?.vehicleColor || "Chưa cập nhật"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaTaxi className="text-orange-500" />
                      Loại xe: {selectedDriver?.vehicleType || "CAR_4_SEAT"}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaTaxi className="text-orange-500" />
                      Số chỗ ngồi: {selectedDriver?.seatCapacity || 4} chỗ
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaCalendarAlt className="text-orange-500" />
                      Năm sản xuất: {selectedDriver?.vehicleYear || "-"}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Sinh trắc học & eKYC (AI)</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaUserShield className="text-orange-500" />
                      eKYC khuôn mặt:{" "}
                      {selectedDriver?.isFaceEnrolled ? (
                        <span className="font-bold text-emerald-600">✓ Đã xác thực</span>
                      ) : (
                          <span className="font-bold text-amber-600">Chưa xác thực</span>
                      )}
                    </p>
                    <p className="flex items-center gap-2 text-slate-700">
                      <FaUserCheck className="text-orange-500" />
                      Độ khớp CCCD & Chân dung:{" "}
                      {selectedDriver?.faceMatchScore != null ? (
                        (() => {
                          const rawScore = Number(selectedDriver.faceMatchScore);
                          const percentage = rawScore > 1 ? rawScore : rawScore * 100;
                          const isHigh = percentage >= 70;
                          const isValid = percentage >= 55;
                          return (
                            <span
                              className={`font-bold ${isHigh
                                ? "text-emerald-600"
                                : isValid
                                  ? "text-amber-600"
                                  : "text-rose-600"
                                }`}
                            >
                              {percentage.toFixed(1)}%
                              {isHigh ? " (Rất cao)" : isValid ? " (Hợp lệ)" : " (Thấp)"}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="font-medium text-slate-400">Chưa đối soát</span>
                      )}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Hình ảnh chứng từ & Phương tiện</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {[
                      { label: "Ảnh chân dung", url: resolveImageUrl(selectedDriver?.portraitImage || selectedDriver?.avatarUrl) },
                      { label: "CCCD mặt trước", url: resolveImageUrl(selectedDriver?.cccdImageFront) },
                      { label: "CCCD mặt sau", url: resolveImageUrl(selectedDriver?.cccdImageBack) },
                      { label: "GPLX mặt trước", url: resolveImageUrl(selectedDriver?.gplxImageFront || selectedDriver?.gplxImage) },
                      { label: "GPLX mặt sau", url: resolveImageUrl(selectedDriver?.gplxImageBack) },
                      { label: "Đăng ký xe mặt trước", url: resolveImageUrl(selectedDriver?.registrationImage) },
                      { label: "Đăng ký xe mặt sau", url: resolveImageUrl(selectedDriver?.insuranceImage || selectedDriver?.registrationImageBack) },
                      { label: "Hình ảnh xe", url: resolveImageUrl(selectedDriver?.vehicleImage) },
                    ].map((doc) => (
                      <div key={doc.label} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                        {doc.url ? (
                          <a href={doc.url} target="_blank" rel="noreferrer" title={doc.label}>
                            <img src={doc.url} alt={doc.label} className="h-36 w-full object-cover transition hover:scale-105" loading="lazy" />
                          </a>
                        ) : (
                          <div className="flex h-36 items-center justify-center text-xs font-semibold text-slate-400">
                            Chưa có ảnh
                          </div>
                        )}
                        <p className="px-3 py-2 text-center text-xs font-semibold text-slate-600 bg-white border-t border-slate-100">{doc.label}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeQuickView}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FaTimes /> Đóng
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === selectedDriver?.id}
                  onClick={handleApproveFromModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-60"
                >
                  <FaCheckCircle /> Phê duyệt
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === selectedDriver?.id}
                  onClick={handleRejectFromModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-600 disabled:opacity-60"
                >
                  <FaTimesCircle /> Từ chối
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* MODAL TỪ CHỐI HỒ SƠ CHUYÊN NGHIỆP */}
        {rejectingDriver ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 transition-all">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-200">
                    <FaExclamationTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Từ Chối Hồ Sơ Tài Xế</h3>
                    <p className="text-xs font-medium text-slate-500">
                      Tài xế: <span className="font-semibold text-rose-600">{getDriverName(rejectingDriver)}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseRejectModal}
                  className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-600 transition"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Gợi ý lý do phổ biến
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    "Ảnh chụp CCCD/GPLX bị mờ, lóa sáng",
                    "Khuôn mặt chụp eKYC không trùng khớp CCCD",
                    "Ảnh đăng ký xe không hợp lệ",
                    "Thông tin xe và biển số không trùng khớp",
                    "Giấy phép lái xe đã hết hạn",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium text-left ${rejectionReason === preset
                        ? "bg-rose-50 border-rose-300 text-rose-700 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <label htmlFor="reject-reason" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Lý do chi tiết gửi đến tài xế
                </label>
                <textarea
                  id="reject-reason"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Nhập lý do từ chối để tài xế biết và chụp lại hồ sơ..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-800 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50 transition resize-none leading-relaxed"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                <button
                  type="button"
                  disabled={actionLoadingId === rejectingDriver.id}
                  onClick={handleCloseRejectModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === rejectingDriver.id || !rejectionReason.trim()}
                  onClick={handleConfirmRejectDriver}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-none transition disabled:opacity-60"
                >
                  {actionLoadingId === rejectingDriver.id ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default AdminDriverApprovalPage;
