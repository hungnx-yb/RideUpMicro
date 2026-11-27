import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FaBan,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaSearch,
  FaStar,
  FaSyncAlt,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  Button,
  Card,
  EmptyState,
  ModalShell,
  StatusBadge,
  formatDateTime,
  formatVnd,
  inputClass,
  useToast,
} from "../../components/admin/AdminUi";
import {
  approveDriverApi,
  approveVehicleApi,
  rejectDriverApi,
  rejectVehicleApi,
  searchAdminDriversApi,
} from "../../services/adminApi";
import { getApiErrorMessage } from "../../services/authApi";
import { resolveImageUrl, vehicleBackAndExtraDocs } from "../../utils/imageUrl";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const DEFAULT_FILTERS = {
  status: "ALL",
  vehicleStatus: "ALL",
  lockStatus: "ALL",
  sort: "NEWEST",
};

const FILTER_FIELDS = [
  {
    key: "status",
    label: "Hồ sơ",
    options: [
      { value: "ALL", label: "Tất cả" },
      { value: "PENDING", label: "Chờ duyệt" },
      { value: "APPROVED", label: "Đã duyệt" },
      { value: "REJECTED", label: "Bị từ chối" },
    ],
  },
  {
    key: "vehicleStatus",
    label: "Phương tiện",
    options: [
      { value: "ALL", label: "Tất cả" },
      { value: "VERIFIED", label: "Đã duyệt" },
      { value: "PENDING", label: "Chờ duyệt" },
      { value: "REJECTED", label: "Bị từ chối" },
      { value: "NONE", label: "Chưa có xe" },
    ],
  },
  {
    key: "lockStatus",
    label: "Nhận chuyến",
    options: [
      { value: "ALL", label: "Tất cả" },
      { value: "ACTIVE", label: "Đang hoạt động" },
      { value: "LOCKED", label: "Bị khóa" },
    ],
  },
  {
    key: "sort",
    label: "Sắp xếp",
    options: [
      { value: "NEWEST", label: "Mới đăng ký nhất" },
      { value: "OLDEST", label: "Cũ nhất" },
      { value: "RATING_DESC", label: "Đánh giá cao nhất" },
      { value: "REPUTATION_ASC", label: "Uy tín thấp nhất" },
      { value: "DEBT_DESC", label: "Công nợ cao nhất" },
      { value: "RIDES_DESC", label: "Nhiều chuyến nhất" },
    ],
  },
];

const DRIVER_STATUS = {
  PENDING: { label: "Chờ duyệt", tone: "amber" },
  APPROVED: { label: "Đã duyệt", tone: "green" },
  REJECTED: { label: "Bị từ chối", tone: "red" },
};

const VEHICLE_TYPE_LABELS = {
  CAR_4_SEAT: "Ô tô 4 chỗ",
  CAR_5_SEAT: "Ô tô 5 chỗ",
  CAR_7_SEAT: "Ô tô 7 chỗ",
  VAN_9_SEAT: "Xe van 9 chỗ",
  VAN_12_SEAT: "Xe van 12 chỗ",
  LIMOUSINE_9_SEAT: "Limousine 9 chỗ",
  LIMOUSINE_11_SEAT: "Limousine 11 chỗ",
  MINIBUS_16_SEAT: "Minibus 16 chỗ",
  MINIBUS_24_SEAT: "Minibus 24 chỗ",
  BUS_29_SEAT: "Xe khách 29 chỗ",
  BUS_35_SEAT: "Xe khách 35 chỗ",
  BUS_45_SEAT: "Xe khách 45 chỗ",
};

// Lý do gợi ý: giữ giống trang Duyệt tài xế / Duyệt phương tiện
const REJECT_PRESETS = {
  driver: [
    "Ảnh chụp CCCD/GPLX bị mờ, lóa sáng",
    "Khuôn mặt chụp eKYC không trùng khớp CCCD",
    "Giấy phép lái xe đã hết hạn",
    "Thông tin cá nhân không trùng khớp giấy tờ",
  ],
  vehicle: [
    "Giấy tờ xe chưa hợp lệ",
    "Ảnh đăng ký xe không hợp lệ",
    "Thông tin xe và biển số không trùng khớp",
    "Đăng kiểm hoặc bảo hiểm xe đã hết hạn",
  ],
};

// Xe chờ duyệt = có xe, chưa duyệt, chưa bị từ chối (cùng điều kiện backend cho phép duyệt)
function isVehiclePending(driver) {
  return Boolean(driver.vehicleId) && !driver.isVehicleVerified && !driver.vehicleRejectedAt;
}

function formatDate(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(value);
}

function vehicleBadge(driver) {
  if (!driver.vehicleId) return { label: "Chưa có xe", tone: "slate" };
  if (driver.isVehicleVerified) return { label: "Xe đã duyệt", tone: "green" };
  if (driver.vehicleRejectedAt) return { label: "Xe bị từ chối", tone: "red" };
  return { label: "Xe chờ duyệt", tone: "amber" };
}

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-800">{children ?? "—"}</span>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function DriverDetailModal({ driver, onClose, onUpdated, showToast }) {
  const [busy, setBusy] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null); // "driver" | "vehicle" | null
  const [rejectReason, setRejectReason] = useState("");

  const canReviewDriver = driver.status === "PENDING";
  const canReviewVehicle = isVehiclePending(driver);

  const runAction = async (key, action, patch, successMessage) => {
    setBusy(key);
    try {
      await action();
      showToast(successMessage);
      setRejectTarget(null);
      setRejectReason("");
      onUpdated({ ...driver, ...patch });
    } catch (error) {
      showToast(getApiErrorMessage(error, "Thao tác thất bại"), "error");
    } finally {
      setBusy("");
    }
  };

  const approveDriver = () => {
    runAction("approve-driver", () => approveDriverApi(driver.id),
      { status: "APPROVED", approvedAt: new Date().toISOString(), rejectionReason: null },
      "Đã duyệt hồ sơ tài xế");
  };

  const approveVehicle = () => {
    runAction("approve-vehicle", () => approveVehicleApi(driver.vehicleId),
      { isVehicleVerified: true, isVehicleActive: true, vehicleRejectedAt: null, vehicleRejectionReason: null },
      "Đã duyệt phương tiện");
  };

  const confirmReject = () => {
    const reason = rejectReason.trim();
    if (!reason) return;
    if (rejectTarget === "driver") {
      runAction("reject-driver", () => rejectDriverApi(driver.id, reason),
        { status: "REJECTED", rejectionReason: reason, approvedAt: null },
        "Đã từ chối hồ sơ tài xế");
    } else {
      runAction("reject-vehicle", () => rejectVehicleApi(driver.vehicleId, reason),
        {
          isVehicleVerified: false,
          isVehicleActive: false,
          vehicleRejectedAt: new Date().toISOString(),
          vehicleRejectionReason: reason,
        },
        "Đã từ chối phương tiện");
    }
  };

  const cancelReject = () => {
    setRejectTarget(null);
    setRejectReason("");
  };

  const footer = rejectTarget ? (
    <div>
      <p className="text-sm font-bold text-slate-800">
        {rejectTarget === "driver" ? "Lý do từ chối hồ sơ tài xế" : "Lý do từ chối phương tiện"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {REJECT_PRESETS[rejectTarget].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setRejectReason(preset)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              rejectReason === preset
                ? "border-rose-300 bg-rose-50 font-semibold text-rose-700"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        placeholder="Lý do sẽ được gửi cho tài xế để chụp lại / bổ sung hồ sơ…"
        className={`${inputClass} mt-2 resize-none`}
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={cancelReject} disabled={Boolean(busy)}>
          Hủy
        </Button>
        <Button variant="danger" onClick={confirmReject} disabled={Boolean(busy) || !rejectReason.trim()}>
          <FaBan /> {busy ? "Đang xử lý…" : "Xác nhận từ chối"}
        </Button>
      </div>
    </div>
  ) : canReviewDriver || canReviewVehicle ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canReviewDriver ? (
        <>
          <Button variant="secondary" onClick={() => setRejectTarget("driver")} disabled={Boolean(busy)}>
            <FaBan /> Từ chối hồ sơ
          </Button>
          <Button onClick={approveDriver} disabled={Boolean(busy)}>
            <FaCheck /> {busy === "approve-driver" ? "Đang duyệt…" : "Duyệt hồ sơ"}
          </Button>
        </>
      ) : null}
      {canReviewVehicle ? (
        <>
          <Button variant="secondary" onClick={() => setRejectTarget("vehicle")} disabled={Boolean(busy)}>
            <FaBan /> Từ chối xe
          </Button>
          <Button onClick={approveVehicle} disabled={Boolean(busy)}>
            <FaCheck /> {busy === "approve-vehicle" ? "Đang duyệt…" : "Duyệt xe"}
          </Button>
        </>
      ) : null}
    </div>
  ) : null;

  const status = DRIVER_STATUS[driver.status] || { label: driver.status || "—", tone: "slate" };
  const vehicle = vehicleBadge(driver);
  const docs = [
    { label: "Ảnh chân dung", url: resolveImageUrl(driver.portraitImage || driver.avatarUrl) },
    { label: "CCCD mặt trước", url: resolveImageUrl(driver.cccdImageFront) },
    { label: "CCCD mặt sau", url: resolveImageUrl(driver.cccdImageBack) },
    { label: "GPLX mặt trước", url: resolveImageUrl(driver.gplxImageFront) },
    { label: "GPLX mặt sau", url: resolveImageUrl(driver.gplxImageBack) },
    ...(driver.vehicleId
      ? [
          { label: "Đăng ký xe mặt trước", url: resolveImageUrl(driver.registrationImage) },
          ...vehicleBackAndExtraDocs(driver),
          { label: "Hình ảnh xe", url: resolveImageUrl(driver.vehicleImage) },
        ]
      : []),
  ];

  return (
    <ModalShell title="Thông tin tài xế" onClose={onClose} maxWidth="max-w-4xl" footer={footer}>
      <div className="mb-4">
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-slate-900">{driver.fullName || "Chưa cập nhật tên"}</p>
          <p className="text-sm text-slate-500">{driver.email}{driver.phoneNumber ? ` · ${driver.phoneNumber}` : ""}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone={vehicle.tone}>{vehicle.label}</StatusBadge>
            {driver.isLocked ? <StatusBadge tone="red">Bị khóa nhận chuyến</StatusBadge> : null}
            {driver.isFaceEnrolled ? <StatusBadge tone="blue">Đã eKYC khuôn mặt</StatusBadge> : null}
          </div>
        </div>
      </div>

      {driver.status === "REJECTED" && driver.rejectionReason ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Lý do từ chối:</strong> {driver.rejectionReason}
        </div>
      ) : null}

      {driver.vehicleRejectedAt ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Phương tiện bị từ chối</strong> ({formatDateTime(driver.vehicleRejectedAt)})
          {driver.vehicleRejectionReason ? `: ${driver.vehicleRejectionReason}` : ""}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <InfoSection title="Hoạt động">
          <InfoRow label="Đánh giá">
            <span className="inline-flex items-center gap-1">
              <FaStar className="text-amber-400" /> {Number(driver.driverRating ?? 0).toFixed(1)}
            </span>
          </InfoRow>
          <InfoRow label="Số chuyến đã chạy">{driver.totalDriverRides ?? 0}</InfoRow>
          <InfoRow label="Điểm uy tín">{driver.reputationScore ?? "—"}</InfoRow>
          <InfoRow label="Công nợ hoa hồng">
            <span className={driver.isLocked && Number(driver.systemDebt) > 0 ? "text-red-600" : ""}>
              {formatVnd(driver.systemDebt)}
            </span>
          </InfoRow>
          <InfoRow label="Ngày đăng ký">{formatDateTime(driver.createdAt)}</InfoRow>
          <InfoRow label="Ngày duyệt">{driver.approvedAt ? formatDateTime(driver.approvedAt) : "—"}</InfoRow>
        </InfoSection>

        <InfoSection title="Giấy tờ">
          <InfoRow label="Số CCCD">{driver.cccd}</InfoRow>
          <InfoRow label="Số GPLX">{driver.gplx}</InfoRow>
          <InfoRow label="Hạng GPLX">{driver.gplxClasses?.length ? driver.gplxClasses.join(", ") : "—"}</InfoRow>
          <InfoRow label="Ngày cấp GPLX">{formatDate(driver.gplxIssueDate)}</InfoRow>
          <InfoRow label="Hết hạn GPLX">{driver.gplxExpiryDate ? formatDate(driver.gplxExpiryDate) : "Không thời hạn"}</InfoRow>
          <InfoRow label="Nơi cấp">{driver.gplxIssuePlace}</InfoRow>
        </InfoSection>

        <InfoSection title="Phương tiện">
          {driver.vehicleId ? (
            <>
              <InfoRow label="Biển số">{driver.plateNumber}</InfoRow>
              <InfoRow label="Hãng / dòng xe">{[driver.vehicleBrand, driver.vehicleModel].filter(Boolean).join(" ") || "—"}</InfoRow>
              <InfoRow label="Loại xe">{VEHICLE_TYPE_LABELS[driver.vehicleType] || driver.vehicleType}</InfoRow>
              <InfoRow label="Số chỗ">{driver.seatCapacity}</InfoRow>
              <InfoRow label="Màu / năm sản xuất">{[driver.vehicleColor, driver.vehicleYear].filter(Boolean).join(" · ") || "—"}</InfoRow>
              <InfoRow label="Đang hoạt động">{driver.isVehicleActive ? "Có" : "Không"}</InfoRow>
            </>
          ) : (
            <p className="py-2 text-sm text-slate-500">Tài xế chưa đăng ký phương tiện.</p>
          )}
        </InfoSection>

        <InfoSection title="Xác thực khuôn mặt (eKYC)">
          <InfoRow label="Đã đăng ký khuôn mặt">{driver.isFaceEnrolled ? "Có" : "Chưa"}</InfoRow>
          <InfoRow label="Độ khớp với CCCD">
            {driver.faceMatchScore != null ? `${(Number(driver.faceMatchScore) * (driver.faceMatchScore <= 1 ? 100 : 1)).toFixed(1)}%` : "—"}
          </InfoRow>
          <InfoRow label="Lần xác minh gần nhất">{driver.lastFaceVerifiedAt ? formatDateTime(driver.lastFaceVerifiedAt) : "—"}</InfoRow>
        </InfoSection>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Hình ảnh giấy tờ & phương tiện</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {docs.map((doc) => (
            <div key={doc.label} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noreferrer" title={doc.label}>
                  <img src={doc.url} alt={doc.label} className="h-32 w-full object-cover transition hover:scale-105" loading="lazy" />
                </a>
              ) : (
                <div className="flex h-32 items-center justify-center text-xs font-semibold text-slate-400">Chưa có ảnh</div>
              )}
              <p className="border-t border-slate-100 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600">{doc.label}</p>
            </div>
          ))}
        </div>
      </section>
    </ModalShell>
  );
}

// Bộ lọc ban đầu lấy từ URL (vd: /admin/drivers?status=PENDING từ thẻ "Tài xế chờ duyệt" ở Dashboard).
// Chỉ nhận giá trị có trong danh sách lựa chọn, giá trị lạ thì dùng mặc định.
function filtersFromQuery(searchParams) {
  const next = { ...DEFAULT_FILTERS };
  FILTER_FIELDS.forEach((field) => {
    const value = searchParams.get(field.key);
    if (value && field.options.some((option) => option.value === value)) next[field.key] = value;
  });
  return next;
}

function AdminDriverManagementPage() {
  const [searchParams] = useSearchParams();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState(() => filtersFromQuery(searchParams));
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], totalElements: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const { showToast, toastElement } = useToast();
  const latestRequestRef = useRef(0);

  // Chờ người dùng ngừng gõ rồi mới tìm, đồng thời quay về trang đầu
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const loadDrivers = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setIsLoading(true);
    try {
      const result = await searchAdminDriversApi({ keyword, ...filters, page, size: PAGE_SIZE });
      // Bỏ qua kết quả của request cũ về muộn hơn request mới
      if (requestId === latestRequestRef.current) setData(result);
    } catch (error) {
      if (requestId === latestRequestRef.current) {
        showToast(getApiErrorMessage(error, "Không tải được danh sách tài xế"), "error");
      }
    } finally {
      if (requestId === latestRequestRef.current) setIsLoading(false);
    }
  }, [keyword, filters, page, showToast]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const hasActiveFilter =
    keywordInput.trim() !== "" || Object.keys(DEFAULT_FILTERS).some((key) => filters[key] !== DEFAULT_FILTERS[key]);

  const resetFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  };

  const totalPages = Math.max(1, data.totalPages || 0);
  const items = data.items || [];

  return (
    <AdminLayout
      title="Quản lý tài xế"
      subtitle="Tra cứu toàn bộ tài xế đã gửi hồ sơ, lọc theo trạng thái hồ sơ, phương tiện, khả năng nhận chuyến và xem chi tiết giấy tờ."
      icon={FaUsers}
      actions={(
        <Button variant="secondary" onClick={loadDrivers} disabled={isLoading}>
          <FaSyncAlt className={isLoading ? "animate-spin" : ""} /> Làm mới
        </Button>
      )}
    >
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[240px] flex-1">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
            <div className="relative mt-1">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Tên, email, SĐT, CCCD, GPLX, biển số…"
                className={`${inputClass} pl-9`}
              />
            </div>
          </label>
          {FILTER_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{field.label}</span>
              <select
                value={filters[field.key]}
                onChange={(e) => updateFilter(field.key, e.target.value)}
                className={`${inputClass} mt-1 min-w-[150px]`}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ))}
          {hasActiveFilter ? (
            <Button variant="ghost" onClick={resetFilters}>
              <FaTimes /> Xóa bộ lọc
            </Button>
          ) : null}
        </div>
      </Card>

      <Card
        title={`Danh sách tài xế (${data.totalElements ?? 0})`}
        description="Hồ sơ chưa gửi đủ thông tin không được hiển thị."
      >
        {isLoading && items.length === 0 ? (
          <EmptyState>Đang tải danh sách tài xế…</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>{hasActiveFilter ? "Không có tài xế nào khớp bộ lọc." : "Chưa có tài xế nào."}</EmptyState>
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${isLoading ? "opacity-60" : ""}`}>
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="w-12 py-3 pr-3 text-center">STT</th>
                    <th className="py-3 pr-3">Tài xế</th>
                    <th className="py-3 pr-3">Thông tin</th>
                    <th className="py-3 pr-3 text-right">Đánh giá</th>
                    <th className="py-3 pr-3 text-right">Uy tín</th>
                    <th className="py-3 pr-3 text-right">Công nợ</th>
                    <th className="py-3 pr-3">Trạng thái</th>
                    <th className="py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((driver, index) => {
                    const status = DRIVER_STATUS[driver.status] || { label: driver.status || "—", tone: "slate" };
                    const vehicle = vehicleBadge(driver);
                    return (
                      <tr key={driver.id} className="border-b border-slate-200 align-middle hover:bg-slate-50/70">
                        {/* STT nối tiếp qua các trang: trang 2 bắt đầu từ 21 */}
                        <td className="py-3 pr-3 text-center font-semibold text-slate-500">{page * PAGE_SIZE + index + 1}</td>
                        <td className="py-3 pr-3">
                          <p className="font-bold text-slate-900">{driver.fullName || "Chưa cập nhật tên"}</p>
                        </td>
                        <td className="py-3 pr-3 text-xs text-slate-600">
                          <p>SĐT: <span className="font-semibold text-slate-800">{driver.phoneNumber || "—"}</span></p>
                          <p className="mt-0.5">CCCD: <span className="font-semibold text-slate-800">{driver.cccd || "—"}</span></p>
                          <p className="mt-0.5">GPLX: <span className="font-semibold text-slate-800">{driver.gplx || "—"}</span></p>
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <p className="inline-flex items-center gap-1 font-bold text-slate-800">
                            <FaStar className="text-amber-400" /> {Number(driver.driverRating ?? 0).toFixed(1)}
                          </p>
                          <p className="text-xs text-slate-500">{driver.totalDriverRides ?? 0} chuyến</p>
                        </td>
                        <td className="py-3 pr-3 text-right font-bold text-slate-800">{driver.reputationScore ?? "—"}</td>
                        <td className={`py-3 pr-3 text-right font-bold ${Number(driver.systemDebt) > 0 ? "text-orange-600" : "text-slate-400"}`}>
                          {formatVnd(driver.systemDebt)}
                        </td>
                        <td className="py-3 pr-3">
                          {/* Trạng thái hồ sơ + trạng thái xe (+ bị khóa nhận chuyến nếu có) */}
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge tone={status.tone}>Hồ sơ {status.label.toLowerCase()}</StatusBadge>
                            <StatusBadge tone={vehicle.tone}>{vehicle.label}</StatusBadge>
                            {driver.isLocked ? <StatusBadge tone="red">Bị khóa nhận chuyến</StatusBadge> : null}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setSelectedDriver(driver)}>
                            <FaEye /> Xem
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <span>
                Hiển thị {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + items.length} / {data.totalElements} tài xế
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isLoading}
                >
                  <FaChevronLeft /> Trước
                </Button>
                <span className="font-semibold">Trang {page + 1} / {totalPages}</span>
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isLoading}
                >
                  Sau <FaChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selectedDriver ? (
        <DriverDetailModal
          key={selectedDriver.id}
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          showToast={showToast}
          onUpdated={(updated) => {
            // Cập nhật ngay cửa sổ đang mở, đồng thời tải lại danh sách theo bộ lọc hiện tại
            setSelectedDriver(updated);
            loadDrivers();
          }}
        />
      ) : null}
      {toastElement}
    </AdminLayout>
  );
}

export default AdminDriverManagementPage;
