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
import useAuth from "../../hooks/useAuth";
import AdminLayout, { ADMIN_MENU_GROUPS } from "../../components/admin/AdminLayout";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../services/authApi";
import { formatDriverProfileId } from "../../utils/formatId";
import { formatVnd } from "../../components/admin/AdminUi";
import {
  approveDriverApi,
  approveVehicleApi,
  getPendingDriversApi,
  getPendingDriversCountApi,
  getPendingVehiclesApi,
  getPendingVehiclesCountApi,
  getRevenueKpisApi,
  rejectDriverApi,
  rejectVehicleApi,
} from "../../services/adminApi";


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
        {trend ? (
          <p className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">{trend}</p>
        ) : null}
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
                    <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500" title={driver.id}>
                      <FaIdBadge className="text-xs text-orange-500" /> Mã hồ sơ:{" "}
                      <span className="font-mono font-semibold text-slate-700">{formatDriverProfileId(driver.id)}</span>
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
  const { logout } = useAuth();
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
  const [revenueKpis, setRevenueKpis] = useState(null);

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

      getRevenueKpisApi().then(setRevenueKpis).catch(() => { });
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
    getRevenueKpisApi().then(setRevenueKpis).catch(() => { });

    if (activeTab === "drivers") {
      await loadPendingDriverList({ force: true });
      return;
    }

    if (activeTab === "vehicles") {
      await loadPendingVehicleList({ force: true });
    }
  };

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
    <AdminLayout
      title="Bảng điều khiển"
      subtitle="Tổng quan hoạt động và dữ liệu phê duyệt hệ thống RideUp theo thời gian thực"
      icon={FaUserShield}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPendingCounts}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <FaSyncAlt className={isLoadingCounts ? "animate-spin text-orange-500" : "text-slate-400"} />
            Làm mới
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ADM-FEAT-01 → 06: lối tắt tới các chức năng quản trị mở rộng */}
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">Công cụ quản trị</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {ADMIN_MENU_GROUPS.slice(1).flatMap((group) => group.items).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                    <Icon className="text-sm" />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={FaUsers}
            value={Math.max(1, totalUsers)}
            title="Tổng người dùng"
            sub={`${pendingDriverCount} tài xế chờ duyệt, ${pendingVehicleCount} xe chờ duyệt`}
            accent="blue"
          />
          <KpiCard
            icon={FaCar}
            value={revenueKpis?.completedBookings ?? 0}
            title="Vé hoàn thành"
            sub="Số chuyến đi hoàn thành thành công"
            accent="amber"
          />
          <KpiCard
            icon={FaMapMarkedAlt}
            value={formatVnd(revenueKpis?.totalGmv ?? 0)}
            title="Tổng giá trị giao dịch"
            sub="Doanh số toàn hệ thống"
            accent="emerald"
          />
          <KpiCard
            icon={FaRegChartBar}
            value={formatVnd(revenueKpis?.commissionRevenue ?? 0)}
            title="Doanh thu hoa hồng sàn"
            sub="Doanh thu nền tảng tích lũy"
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
      </div>
    </AdminLayout>
  );
}

export default AdminDashboardPage;
