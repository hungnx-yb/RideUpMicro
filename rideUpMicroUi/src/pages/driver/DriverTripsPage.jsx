import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCommentDots,
  FaCheckCircle,
  FaClock,
  FaFilter,
  FaMoneyBillWave,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaTimesCircle,
  FaUserCircle,
  FaUsers,
} from "react-icons/fa";
import DriverNavbar from "../../components/DriverNavbar";
import { searchAllDriveTripApi } from "../../services/tripApi";
import { getAllProvinces } from "../../services/locationApi";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getBookingsByTripIdApi } from "../../services/bookingApi";

const BOOKING_STATUS_META = {
  CONFIRMED: { label: "Đã xác nhận", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: FaCheckCircle },
  PENDING_PAYMENT: { label: "Chờ thanh toán", className: "bg-amber-50 text-amber-700 border-amber-200", icon: FaClock },
  CANCELLED: { label: "Đã hủy", className: "bg-rose-50 text-rose-600 border-rose-200", icon: FaTimesCircle },
};

function normalizeBookingStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "COMPLETED") {
    return "CONFIRMED";
  }
  if (normalized === "PENDING") {
    return "PENDING_PAYMENT";
  }
  if (normalized.startsWith("CANCELLED") || normalized === "EXPIRED") {
    return "CANCELLED";
  }
  return "CONFIRMED";
}

function formatMoneyVnd(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")} đ`;
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "--";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "--";
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

function ProvinceDropdown({
  value,
  options,
  placeholder,
  isLoading,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((item) => item.id === value)?.name;

  useEffect(() => {
    const handler = (event) => {
      if (!event.target.closest("[data-province-dropdown]")) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" data-province-dropdown>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-400 focus:outline-none"
      >
        <span className={selectedLabel ? "text-slate-900" : "text-slate-500"}>
          {isLoading ? "Đang tải..." : selectedLabel || placeholder}
        </span>
        <span className={`text-[10px] text-slate-400 transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-32 overflow-y-auto py-1">
            {options.length ? (
              options.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs transition hover:bg-emerald-50 ${
                    item.id === value ? "bg-emerald-50 text-emerald-700" : "text-slate-700"
                  }`}
                >
                  {item.name}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-slate-500">Không có dữ liệu</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DriverTripsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName?.trim() || user?.email || "Tài xế";

  const [filters, setFilters] = useState({
    startProvinceId: "",
    endProvinceId: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(0);
  const [size] = useState(8);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadTrips = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await searchAllDriveTripApi({
        ...filters,
        page,
        size,
      });
      setItems(Array.isArray(response?.items) ? response.items : []);
      setTotal(Number(response?.count || 0));
    } catch (err) {
      setError("Không thể tải danh sách chuyến cho tài xế.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [page]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        setIsLoadingProvinces(true);
        const response = await getAllProvinces();
        setProvinces(Array.isArray(response) ? response : []);
      } catch (err) {
        setError("Không thể tải danh sách tỉnh/thành.");
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  const stats = useMemo(() => {
    const statusCount = items.reduce(
      (acc, trip) => {
        const key = String(trip?.status || "").toUpperCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { OPEN: 0, FULL: 0, STARTED: 0, COMPLETED: 0, CANCELED: 0 }
    );

    return {
      total,
      open: statusCount.OPEN,
      started: statusCount.STARTED,
      full: statusCount.FULL,
    };
  }, [items, total]);

  const handleFilterChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleApplyFilters = () => {
    setPage(0);
    loadTrips();
  };

  const handleResetFilters = () => {
    setFilters({
      startProvinceId: "",
      endProvinceId: "",
      startDate: "",
      endDate: "",
    });
    setPage(0);
    loadTrips();
  };

  const totalPages = size > 0 ? Math.ceil(total / size) : 0;
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  useEffect(() => {
    const fetchBookings = async () => {
      if (!selectedTrip?.id) {
        setBookings([]);
        setBookingError("");
        return;
      }

      try {
        setIsLoadingBookings(true);
        setBookingError("");
        const response = await getBookingsByTripIdApi(selectedTrip.id);
        setBookings(Array.isArray(response) ? response : []);
      } catch (err) {
        setBookingError("Không thể tải danh sách booking của chuyến.");
        setBookings([]);
      } finally {
        setIsLoadingBookings(false);
      }
    };

    fetchBookings();
  }, [selectedTrip]);

  return (
    <div className="min-h-screen bg-slate-50">
      <DriverNavbar driverName={displayName} tripsToday={`${stats.started || 0}x`} />

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-500">Driver Trips</p>
              <h1 className="text-2xl font-semibold text-slate-900">Quản lý chuyến chạy</h1>
              <p className="text-sm text-slate-500">Lọc nhanh theo tỉnh và thời gian để theo dõi các chuyến bạn đang vận hành.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Tổng</p>
                <p className="text-lg font-extrabold text-emerald-700">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Đang mở</p>
                <p className="text-lg font-extrabold text-slate-900">{stats.open}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Đang chạy</p>
                <p className="text-lg font-extrabold text-slate-900">{stats.started}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Đã kín</p>
                <p className="text-lg font-extrabold text-slate-900">{stats.full}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FaFilter className="text-emerald-500" />
              Bộ lọc chuyến
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tỉnh đi</span>
                <div className="mt-2">
                  <ProvinceDropdown
                    value={filters.startProvinceId}
                    options={provinces}
                    placeholder="Chọn tỉnh đi"
                    isLoading={isLoadingProvinces}
                    onChange={(value) => setFilters((prev) => ({ ...prev, startProvinceId: value }))}
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tỉnh đến</span>
                <div className="mt-2">
                  <ProvinceDropdown
                    value={filters.endProvinceId}
                    options={provinces}
                    placeholder="Chọn tỉnh đến"
                    isLoading={isLoadingProvinces}
                    onChange={(value) => setFilters((prev) => ({ ...prev, endProvinceId: value }))}
                  />
                </div>
              </label>

              <div className="grid gap-3">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Từ ngày</span>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={handleFilterChange("startDate")}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Đến ngày</span>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={handleFilterChange("endDate")}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-400 focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                >
                  Áp dụng
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Xóa lọc
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                Đang tải danh sách chuyến...
              </div>
            ) : null}

            {!isLoading && items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700">Chưa có chuyến nào phù hợp</p>
                <p className="mt-1 text-sm text-slate-500">Hãy thử lọc lại hoặc chọn khoảng thời gian khác.</p>
              </div>
            ) : null}

            {!isLoading && items.length > 0 ? (
              <div className="space-y-3">
                {items.map((trip) => {
                  const seatTotal = Number(trip.seatTotal || 0);
                  const seatAvailable = Number(trip.seatAvailable || 0);
                  const seatsBooked = Math.max(seatTotal - seatAvailable, 0);
                  const revenue = Number(trip.priceVnd || 0) * seatsBooked;

                  return (
                    <article
                      key={trip.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                      onClick={() => setSelectedTrip(trip)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedTrip(trip);
                        }
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                            Lộ trình
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-slate-900">
                            {trip.startAddressText || "Chưa có điểm đi"}
                          </h3>
                          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                            <FaMapMarkerAlt className="text-emerald-500" />
                            <span>{trip.endAddressText || "Chưa có điểm đến"}</span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Doanh thu</p>
                          <p className="text-lg font-extrabold text-emerald-700">{formatMoneyVnd(revenue)}</p>
                          <p className="text-xs text-emerald-600">{seatAvailable} chỗ trống</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <FaCalendarAlt className="text-emerald-500" />
                          <span>{formatDateTime(trip.departureTime)}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <FaTicketAlt className="text-emerald-500" />
                          <span>Giá vé {formatMoneyVnd(trip.priceVnd)}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <FaUsers className="text-emerald-500" />
                          <span>{seatAvailable} chỗ trống</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                        <FaMoneyBillWave className="text-emerald-500" />
                        <span>Doanh thu = giá vé x số ghế đã đặt</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <span>
                Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={!canPrev}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition disabled:opacity-50"
                >
                  <FaChevronLeft className="text-[10px]" />
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!canNext}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition disabled:opacity-50"
                >
                  Sau
                  <FaChevronRight className="text-[10px]" />
                </button>
              </div>
            </div>
          </section>
        </section>
      </main>

      {selectedTrip ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 backdrop-blur-sm lg:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedTrip(null)}
            aria-label="Dong danh sach booking"
          />
          <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500">Bookings</p>
                <h2 className="text-xl font-semibold text-slate-900">Danh sách đặt chỗ</h2>
                <p className="text-sm text-slate-500">
                  {selectedTrip.startAddressText || "Điểm đi"} → {selectedTrip.endAddressText || "Điểm đến"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Giờ khởi hành</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDateTime(selectedTrip.departureTime)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Giá vé</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatMoneyVnd(selectedTrip.priceVnd)}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Ghế trống</p>
                <p className="text-sm font-semibold text-emerald-700">{selectedTrip.seatAvailable}</p>
              </div>
            </div>

            <div className="mt-4 max-h-[340px] space-y-3 overflow-y-auto pr-1">
              {bookingError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {bookingError}
                </div>
              ) : null}

              {isLoadingBookings ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Đang tải booking...
                </div>
              ) : null}

              {!isLoadingBookings && bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">Chưa có booking nào</p>
                  <p className="mt-1 text-sm text-slate-500">Danh sách sẽ cập nhật khi khách đặt chỗ.</p>
                </div>
              ) : null}

              {!isLoadingBookings
                ? bookings.map((booking) => {
                const normalizedStatus = normalizeBookingStatus(booking.status);
                const meta = BOOKING_STATUS_META[normalizedStatus] || BOOKING_STATUS_META.CONFIRMED;
                const StatusIcon = meta.icon;
                const customerLabel = booking.userName || "Khach hang";
                const seatCount = Number(booking.seatCount || 0);
                const totalAmount = booking.totalAmount || 0;

                return (
                  <div
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBooking(booking)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedBooking(booking);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-emerald-600">
                        {booking.userAvatar ? (
                          <img src={booking.userAvatar} alt={customerLabel} className="h-full w-full object-cover" />
                        ) : (
                          <FaUserCircle />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{customerLabel}</p>
                        <p className="text-xs text-slate-500">{seatCount} ghế · {formatMoneyVnd(totalAmount)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
                        <StatusIcon className="text-[11px]" />
                        {meta.label}
                      </span>
                      {normalizedStatus === "CONFIRMED" ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/chat/${booking.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          <FaCommentDots className="text-[11px]" />
                          Chat
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
              : null}
            </div>
          </div>
        </div>
      ) : null}

      {selectedBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedBooking(null)}
            aria-label="Đóng chi tiết booking"
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500">Chi tiết booking</p>
                <h3 className="text-lg font-semibold text-slate-900">{selectedBooking.userName || "Khách hàng"}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Đóng
              </button>
            </div>

            {(() => {
              const normalizedStatus = normalizeBookingStatus(selectedBooking.status);
              const meta = BOOKING_STATUS_META[normalizedStatus] || BOOKING_STATUS_META.CONFIRMED;
              const StatusIcon = meta.icon;
              return (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-slate-700">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${meta.className}`}>
                    <StatusIcon className="text-[11px]" />
                    {meta.label}
                  </span>
                  <span className="text-slate-500">Trạng thái booking</span>
                </div>
              );
            })()}

            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ghế đặt</p>
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <FaUsers className="text-emerald-500" />
                  {selectedBooking.seatCount} ghế
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tổng tiền</p>
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <FaMoneyBillWave className="text-emerald-500" />
                  {formatMoneyVnd(selectedBooking.totalAmount)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Giá vé</p>
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <FaTicketAlt className="text-emerald-500" />
                  {formatMoneyVnd(selectedBooking.pricePerSeat)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Điểm đón</p>
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <FaMapMarkerAlt className="text-emerald-500" />
                  {selectedBooking.pickupAddressText || "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Điểm trả</p>
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <FaMapMarkerAlt className="text-rose-400" />
                  {selectedBooking.dropoffAddressText || "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Thời gian đặt</p>
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <FaCalendarAlt className="text-emerald-500" />
                  {formatDateTime(selectedBooking.reservedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DriverTripsPage;
