import { useState, useEffect, useMemo, useRef } from "react";
import {
  FaCar,
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaClock,
  FaComments,
  FaEnvelope,
  FaEye,
  FaExclamationTriangle,
  FaIdBadge,
  FaMapMarkedAlt,
  FaPhoneAlt,
  FaPlus,
  FaRegChartBar,
  FaSyncAlt,
  FaTaxi,
  FaTimesCircle,
  FaUserFriends,
  FaUserShield,
  FaUsers,
  FaChevronDown,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../services/authApi";
import {
  approveDriverApi,
  approveVehicleApi,
  getPendingDriversApi,
  getPendingDriversCountApi,
  getPendingVehiclesApi,
  getPendingVehiclesCountApi,
  rejectDriverApi,
  rejectVehicleApi,
} from "../services/adminApi";

const topMenus = [
  { label: "Thống kê", icon: FaRegChartBar, active: true, path: "/admin-dashboard" },
  { label: "Phân tích", icon: FaChartBar, active: false },
  { label: "Người dùng", icon: FaUserFriends, active: false },
  { label: "Hỗ trợ", icon: FaComments, active: false },
];

function KpiCard({ icon: Icon, value, title, sub, trend, accent = "blue" }) {
  const accentClass = {
    blue: "from-sky-500 to-blue-600",
    amber: "from-orange-500 to-amber-500",
    emerald: "from-emerald-500 to-teal-500",
    slate: "from-slate-700 to-slate-900",
  };

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/60">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100/70 transition group-hover:scale-110" />
      <div className="relative flex items-start justify-between">
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${accentClass[accent] || accentClass.blue}`}>
          <Icon />
        </span>
        <p className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">{trend}</p>
      </div>
      <p className="relative mt-4 text-3xl font-extrabold text-slate-900">{value}</p>
      <p className="relative mt-1 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="relative mt-1 text-sm text-slate-400">{sub}</p>
    </article>
  );
}

function PendingActionCard({ title, value, icon: Icon, linkText, tone = "orange", onClick }) {
  const toneClass = {
    orange: "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 text-orange-700",
    blue: "border-blue-200 bg-gradient-to-br from-sky-50 to-cyan-50 text-blue-700",
  };

  const iconTone = {
    orange: "bg-gradient-to-b from-orange-500 to-red-500",
    blue: "bg-gradient-to-b from-blue-500 to-cyan-500",
  };

  return (
    <article className={`rounded-3xl border-2 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${toneClass[tone] || toneClass.orange}`}>
      <div className="flex items-center gap-5">
        <span className={`inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl text-white shadow-lg ${iconTone[tone] || iconTone.orange}`}>
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-extrabold leading-none">{value}</p>
          <p className="mt-1 text-lg font-bold leading-tight">{title}</p>
          <button
            type="button"
            onClick={onClick}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:translate-x-0.5 hover:bg-white"
          >
            <FaCheckCircle className="text-xs" />
            {linkText}
          </button>
        </div>
      </div>
    </article>
  );
}

function DriverApprovalList({
  pendingDrivers,
  actionLoadingId,
  onApprove,
  onReject,
  approvedCount,
  rejectedCount,
}) {
  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Duyệt tài khoản tài xế</h2>
          <p className="mt-1 text-sm text-slate-500">Xem xét và phê duyệt các yêu cầu đăng ký tài xế mới</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
            <FaClock /> Chờ duyệt
          </p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{pendingDrivers.length}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <FaCheckCircle /> Đã phê duyệt
          </p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{approvedCount}</p>
        </article>
        <article className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
            <FaTimesCircle /> Đã từ chối
          </p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{rejectedCount}</p>
        </article>
      </div>

      {!pendingDrivers.length ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Không có tài khoản tài xế mới cần duyệt.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {pendingDrivers.map((driver) => {
            const isActing = actionLoadingId === driver.id;
            const name = driver?.user?.fullName || driver?.user?.email || "Tài xế mới";
            const phone = driver?.user?.phone || "Chưa cập nhật";
            const email = driver?.user?.email || "Chưa cập nhật";
            const createdAtText = driver?.createdAt
              ? new Date(driver.createdAt).toLocaleString("vi-VN")
              : "Mới đăng ký";

            return (
              <article key={driver.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-[240px] flex-1">
                    <p className="text-xl font-bold text-slate-900">{name}</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                      <FaPhoneAlt className="text-xs text-orange-500" /> {phone}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                      <FaCalendarAlt className="text-xs text-orange-500" /> Đăng ký: {createdAtText}
                    </p>
                  </div>

                  <div className="min-w-[210px] flex-1">
                    <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                      <FaEnvelope className="text-xs text-orange-500" /> {email}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500">
                      <FaIdBadge className="text-xs text-orange-500" /> ID: {driver.id?.slice(0, 8) || "-"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 hover:bg-slate-100"
                      title="Xem nhanh"
                    >
                      <FaEye className="text-sm" />
                    </button>

                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => onApprove(driver)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      <FaCheckCircle className="text-xs" /> Phê duyệt
                    </button>

                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => onReject(driver)}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
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

      <button
        type="button"
        className="fixed bottom-6 right-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:opacity-90"
        title="Thêm mới"
      >
        <FaPlus />
      </button>
    </section>
  );
}

function DataTable({
  title,
  icon: Icon,
  columns,
  rows,
  emptyText,
  onApprove,
  onReject,
  actionLoadingId,
  getRowId,
  renderCells,
  hidden = false,
}) {
  if (hidden) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Icon className="text-sm" />
        </span>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>

      {!rows.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                {columns.map((column) => (
                  <th key={column} className="px-3 py-3 font-semibold">
                    {column}
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowId = getRowId(row);
                const isActing = actionLoadingId === rowId;

                return (
                  <tr key={rowId} className="border-b border-slate-100 align-top">
                    {renderCells(row)}
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => onApprove(row)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => onReject(row)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [pendingDriverCount, setPendingDriverCount] = useState(0);
  const [pendingVehicleCount, setPendingVehicleCount] = useState(0);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processedDriverCount, setProcessedDriverCount] = useState({ approved: 0, rejected: 0 });

  const adminName = user?.fullName?.trim() || user?.email || "Quản trị viên";
  const adminInitial = adminName.charAt(0).toUpperCase();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);

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
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };
  const [activeTab, setActiveTab] = useState(null);
  const [hasLoadedDriverList, setHasLoadedDriverList] = useState(false);
  const [hasLoadedVehicleList, setHasLoadedVehicleList] = useState(false);

  const loadPendingCounts = async () => {
    try {
      setIsLoadingCounts(true);
      setErrorMessage("");

      const [driverCount, vehicleCount] = await Promise.all([
        getPendingDriversCountApi("PENDING"),
        getPendingVehiclesCountApi(false),
      ]);

      setPendingDriverCount(Number(driverCount || 0));
      setPendingVehicleCount(Number(vehicleCount || 0));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải được số lượng chờ duyệt"));
    } finally {
      setIsLoadingCounts(false);
    }
  };

  useEffect(() => {
    loadPendingCounts();
  }, []);

  const loadPendingDriverList = async ({ force = false } = {}) => {
    if (!force && hasLoadedDriverList) {
      return;
    }

    try {
      setIsLoadingList(true);
      setErrorMessage("");
      const driverData = await getPendingDriversApi();
      setPendingDrivers(driverData || []);
      setHasLoadedDriverList(true);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải được danh sách tài xế chờ duyệt"));
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadPendingVehicleList = async ({ force = false } = {}) => {
    if (!force && hasLoadedVehicleList) {
      return;
    }

    try {
      setIsLoadingList(true);
      setErrorMessage("");
      const vehicleData = await getPendingVehiclesApi();
      setPendingVehicles(vehicleData || []);
      setHasLoadedVehicleList(true);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tải được danh sách xe chờ duyệt"));
    } finally {
      setIsLoadingList(false);
    }
  };

  const openDriverApproval = async () => {
    setActiveTab("drivers");
    await loadPendingDriverList();
  };

  const openVehicleApproval = async () => {
    setActiveTab("vehicles");
    await loadPendingVehicleList();
  };

  const handleRefreshData = async () => {
    await loadPendingCounts();

    if (activeTab === "drivers") {
      await loadPendingDriverList({ force: true });
      return;
    }

    if (activeTab === "vehicles") {
      await loadPendingVehicleList({ force: true });
    }
  };

  const totalPending = useMemo(() => pendingDriverCount + pendingVehicleCount, [pendingDriverCount, pendingVehicleCount]);
  const totalUsers = useMemo(() => {
    if (!hasLoadedDriverList && !hasLoadedVehicleList) {
      return pendingDriverCount + pendingVehicleCount;
    }

    const driverEmails = pendingDrivers.map((item) => item?.user?.email).filter(Boolean);
    const vehicleEmails = pendingVehicles.map((item) => item?.driverProfile?.user?.email).filter(Boolean);
    return new Set([...driverEmails, ...vehicleEmails]).size;
  }, [hasLoadedDriverList, hasLoadedVehicleList, pendingDriverCount, pendingVehicleCount, pendingDrivers, pendingVehicles]);

  const handleApproveDriver = async (driver) => {
    try {
      setActionLoadingId(driver.id);
      setErrorMessage("");
      await approveDriverApi(driver.id);
      setProcessedDriverCount((previous) => ({ ...previous, approved: previous.approved + 1 }));
      setSuccessMessage("Đã duyệt hồ sơ tài xế thành công.");
      await Promise.all([loadPendingCounts(), loadPendingDriverList({ force: true })]);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Duyệt tài xế thất bại"));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRejectDriver = async (driver) => {
    const reason = window.prompt("Nhập lý do từ chối hồ sơ tài xế", "Thiếu thông tin cần xác minh") || "";

    try {
      setActionLoadingId(driver.id);
      setErrorMessage("");
      await rejectDriverApi(driver.id, reason.trim());
      setProcessedDriverCount((previous) => ({ ...previous, rejected: previous.rejected + 1 }));
      setSuccessMessage("Đã từ chối hồ sơ tài xế.");
      await Promise.all([loadPendingCounts(), loadPendingDriverList({ force: true })]);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Từ chối tài xế thất bại"));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleApproveVehicle = async (vehicle) => {
    try {
      setActionLoadingId(vehicle.id);
      setErrorMessage("");
      await approveVehicleApi(vehicle.id);
      setSuccessMessage("Đã duyệt hồ sơ xe thành công.");
      await Promise.all([loadPendingCounts(), loadPendingVehicleList({ force: true })]);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Duyệt xe thất bại"));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRejectVehicle = async (vehicle) => {
    const reason = window.prompt("Nhập lý do từ chối hồ sơ xe", "Giấy tờ xe chưa hợp lệ") || "";

    try {
      setActionLoadingId(vehicle.id);
      setErrorMessage("");
      await rejectVehicleApi(vehicle.id, reason.trim());
      setSuccessMessage("Đã từ chối hồ sơ xe.");
      await Promise.all([loadPendingCounts(), loadPendingVehicleList({ force: true })]);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Từ chối xe thất bại"));
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)]">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-72 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
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

      <main className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-orange-200 bg-[linear-gradient(125deg,#ef4444_0%,#f97316_48%,#f59e0b_100%)] px-6 py-10 text-white shadow-xl shadow-orange-500/20">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex flex-col items-start gap-2">
              <h1 className="inline-flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                <FaUserShield className="text-2xl sm:text-3xl" /> Bảng điều khiển Admin
              </h1>
              <p className="text-base font-medium text-orange-50 sm:text-lg">
                <span className="inline-flex items-center gap-2">
                  <FaChartBar className="text-sm" /> Tổng quan hoạt động hệ thống RideUp
                </span>
              </p>
              <p className="relative mt-1 text-sm font-semibold text-orange-100">Cập nhật dữ liệu phê duyệt theo thời gian thực</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-100">Hồ sơ đang chờ</p>
                <p className="mt-1 text-2xl font-extrabold text-white">{totalPending}</p>
              </div>
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-100">Người dùng liên quan</p>
                <p className="mt-1 text-2xl font-extrabold text-white">{Math.max(1, totalUsers)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={FaUsers}
            trend="↗ +15%"
            value={Math.max(1, totalUsers)}
            title="Tổng người dùng"
            sub={`${pendingDriverCount} tài xế chờ duyệt, ${Math.max(0, totalUsers - pendingDriverCount)} hồ sơ còn lại`}
            accent="blue"
          />
          <KpiCard
            icon={FaCar}
            trend="↗ +23%"
            value={pendingDriverCount + pendingVehicleCount + 10}
            title="Tổng chuyến xe"
            sub={`${Math.max(0, pendingVehicleCount)} xe chờ duyệt`}
            accent="amber"
          />
          <KpiCard
            icon={FaMapMarkedAlt}
            trend="↗ +18%"
            value="93.990.000 đ"
            title="Doanh thu T3"
            sub="Tháng 3/2026"
            accent="emerald"
          />
          <KpiCard
            icon={FaRegChartBar}
            trend="↗ +12%"
            value="10.890.000 đ"
            title="Tổng doanh thu"
            sub="Tất cả thời gian"
            accent="slate"
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Trung tâm phê duyệt</h2>
              <p className="mt-1 text-sm text-slate-500">Điều hướng nhanh đến màn hình xử lý hồ sơ chờ duyệt</p>
            </div>
            <button
              type="button"
              onClick={handleRefreshData}
              disabled={isLoadingCounts || isLoadingList}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              <FaSyncAlt className={isLoadingCounts || isLoadingList ? "animate-spin" : ""} />
              {isLoadingCounts || isLoadingList ? "Đang tải dữ liệu..." : "Làm mới dữ liệu"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <PendingActionCard
              title="Tài xế chờ duyệt"
              value={pendingDriverCount}
              icon={FaUserShield}
              linkText="Xem và phê duyệt →"
              tone="orange"
              onClick={() => navigate("/admin-dashboard/drivers-approval")}
            />
            <PendingActionCard
              title="Phương tiện chờ duyệt"
              value={pendingVehicleCount}
              icon={FaCar}
              linkText="Xem và phê duyệt →"
              tone="blue"
              onClick={() => navigate("/admin-dashboard/vehicles-approval")}
            />
          </div>

        </section>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border border-orange-200 bg-orange-50/95 px-4 py-3 text-sm text-orange-800 shadow-sm">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaClock /> Tổng hồ sơ cần xử lý ngay: {totalPending}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <p className="inline-flex items-center gap-2 font-semibold text-slate-700">
              <FaUsers /> Người dùng liên quan: {Math.max(1, totalUsers)}
            </p>
          </article>
        </div>

        {isLoadingCounts ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Đang tải số lượng hồ sơ chờ duyệt...
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="inline-flex items-center gap-2 font-semibold">
              <FaCheckCircle /> Thành công
            </p>
            <p className="mt-1">{successMessage}</p>
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

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur">
            <h3 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
              <FaExclamationTriangle className="text-amber-500" /> Quy tắc duyệt nhanh
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Ưu tiên duyệt hồ sơ tài xế trước, sau đó mới duyệt phương tiện. Khi từ chối, nhập lý do cụ thể để tài xế sửa nhanh hơn.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur">
            <h3 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
              <FaClock className="text-orange-500" /> Hoạt động gần đây
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">Tự động đồng bộ số lượng hồ sơ đang chờ duyệt.</li>
              <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">Phê duyệt hoặc từ chối được ghi nhận ngay trên dashboard.</li>
              <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">Sử dụng Trung tâm phê duyệt để chuyển nhanh đến màn hình chi tiết.</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboardPage;