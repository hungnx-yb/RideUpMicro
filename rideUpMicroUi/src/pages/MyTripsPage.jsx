import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaMapMarkerAlt,
  FaRegClock,
  FaSuitcase,
  FaTimesCircle,
} from "react-icons/fa";
import CustomerNavbar from "../components/CustomerNavbar";
import FloatingSupportMenu from "../components/FloatingSupportMenu";
import Modal from "../components/common/Modal";
import { cancelBookingApi, getMyBookingsApi } from "../services/bookingApi";
import { getApiErrorMessage } from "../services/authApi";

const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { key: "RESERVED", label: "Đã đặt" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "CANCELLED", label: "Đã hủy" },
  { key: "EXPIRED", label: "Đã hết hạn" },
];

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

function getStatusMeta(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "CONFIRMED" || normalized === "PAID") {
    return {
      label: "Đã xác nhận",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: <FaCheckCircle className="text-[11px]" />,
    };
  }

  if (normalized === "RESERVED") {
    return {
      label: "Đã đặt",
      className: "border-sky-200 bg-sky-50 text-sky-700",
      icon: <FaClock className="text-[11px]" />,
    };
  }

  if (normalized === "PENDING_PAYMENT") {
    return {
      label: "Chờ thanh toán",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: <FaRegClock className="text-[11px]" />,
    };
  }

  if (normalized === "CANCELLED") {
    return {
      label: "Đã hủy",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      icon: <FaTimesCircle className="text-[11px]" />,
    };
  }

  if (normalized === "EXPIRED") {
    return {
      label: "Đã hết hạn",
      className: "border-slate-200 bg-slate-100 text-slate-700",
      icon: <FaTimesCircle className="text-[11px]" />,
    };
  }

  return {
    label: normalized || "Không xác định ",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    icon: <FaExclamationCircle className="text-[11px]" />,
  };
}

function mapBookingToView(booking) {
  return {
    id: booking?.id || "",
    bookingCode: booking?.bookingCode || "--",
    tripId: booking?.tripId || "--",
    status: booking?.status || "UNKNOWN",
    seatCount: Number(booking?.seatCount || 0),
    totalAmount: booking?.totalAmount,
    pickupAddressText: booking?.pickupAddressText || "Chưa có điểm đón",
    dropoffAddressText: booking?.dropoffAddressText || "Chưa có điểm trả",
    note: booking?.note || "Không có ghi chú nào",
    reservedAt: booking?.reservedAt || booking?.createdAt,
    expiresAt: booking?.expiresAt,
    cancelReason: booking?.cancelReason || "",
  };
}

function MyTripsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await getMyBookingsApi();
      setBookings(Array.isArray(response) ? response.map(mapBookingToView) : []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Không tải được danh sách chuyến của bạn");
      setErrorMessage(message);
      setErrorModalMessage(message);
      setIsErrorModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    if (selectedStatus === "ALL") {
      return bookings;
    }

    return bookings.filter((item) => String(item.status || "").toUpperCase() === selectedStatus);
  }, [bookings, selectedStatus]);

  const stats = useMemo(() => {
    const pending = bookings.filter((item) => String(item.status || "").toUpperCase() === "PENDING_PAYMENT").length;
    const confirmed = bookings.filter((item) => ["RESERVED", "CONFIRMED"].includes(String(item.status || "").toUpperCase())).length;

    return {
      total: bookings.length,
      pending,
      confirmed,
    };
  }, [bookings]);

  const canCancelBooking = (status) => {
    const normalized = String(status || "").toUpperCase();
    return normalized === "PENDING_PAYMENT" || normalized === "RESERVED";
  };

  const handleCancelBooking = async (bookingId) => {
    if (!bookingId || isCancelling) {
      return;
    }

    try {
      setIsCancelling(true);
      setSuccessMessage("");
      await cancelBookingApi(bookingId, "Khách hàng hủy booking");
      setSuccessMessage("Hủy chuyến thành công. Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.");
      await loadBookings();
    } catch (error) {
      const message = getApiErrorMessage(error, "Không thể hủy chuyến lúc này");
      setErrorMessage(message);
      setErrorModalMessage(message);
      setIsErrorModalOpen(true);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_100%_-20%,#dcfce7_0%,#f8fafc_38%,#f1f5f9_100%)]">
      <CustomerNavbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-900 p-5 text-white shadow-xl shadow-slate-900/20 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                <FaSuitcase className="text-[11px]" />
                My trips
              </p>
              <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Chuyến của tôi</h1>
              <p className="mt-1 text-sm text-emerald-50/90">Theo dõi tất cả booking, trạng thái và thông tin đơn/tra tại một nơi.</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center">
                <p className="text-emerald-100/90">Tổng chuyến</p>
                <p className="text-lg font-extrabold">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center">
                <p className="text-emerald-100/90">Chờ xử lý</p>
                <p className="text-lg font-extrabold">{stats.pending}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-center">
                <p className="text-emerald-100/90">Đã đặt</p>
                <p className="text-lg font-extrabold">{stats.confirmed}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => {
              const isActive = selectedStatus === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-4 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
              Đang tải danh sách chuyến của bạn...
            </div>
          ) : null}

          {!isLoading && filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">Bạn chưa có chuyến nào trong mục này</p>
              <p className="mt-1 text-sm text-slate-500">Đặt chuyến mới từ trang tìm chuyến để bắt đầu hành trình.</p>
            </div>
          ) : null}

          {!isLoading
            ? filteredBookings.map((booking) => {
                const statusMeta = getStatusMeta(booking.status);

                return (
                  <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking</p>
                        <h3 className="text-lg font-extrabold text-slate-900">{booking.bookingCode}</h3>
                        <p className="text-xs text-slate-500">Trip ID: {booking.tripId}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                        {statusMeta.icon}
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                        <div className="flex items-start gap-2 text-sm text-slate-700">
                          <FaMapMarkerAlt className="mt-0.5 text-emerald-600" />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điểm đón</p>
                            <p>{booking.pickupAddressText}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-sm text-slate-700">
                          <FaMapMarkerAlt className="mt-0.5 text-rose-500" />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điểm trả</p>
                            <p>{booking.dropoffAddressText}</p>
                          </div>
                        </div>
                      </div>

                      <aside className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Tổng tiền</p>
                        <p className="text-lg font-extrabold text-emerald-600">{formatMoneyVnd(booking.totalAmount)}</p>

                        <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Số chỗ</p>
                        <p className="text-sm font-semibold text-slate-800">{booking.seatCount} chỗ</p>

                        <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Đặt lúc</p>
                        <p className="text-sm font-semibold text-slate-800">{formatDateTime(booking.reservedAt)}</p>
                      </aside>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <FaCalendarAlt className="text-[11px]" />
                          Hạn thanh toán: {formatDateTime(booking.expiresAt)}
                        </span>
                      </div>

                      {canCancelBooking(booking.status) ? (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={isCancelling}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isCancelling ? "Dang huy..." : "Huy booking"}
                        </button>
                      ) : null}
                    </div>

                    {booking.cancelReason ? (
                      <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
                        Lý do hủy: {booking.cancelReason}
                      </div>
                    ) : null}

                    {booking.note ? (
                      <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                        Ghi chú: {booking.note}
                      </div>
                    ) : null}
                  </article>
                );
              })
            : null}
        </section>
      </main>

      <Modal title="Co loi xay ra" isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} isTopPriority>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <div className="inline-flex items-start gap-2">
            <FaExclamationCircle className="mt-0.5 text-red-500" />
            <span>{errorModalMessage || "Da co loi xay ra. Vui long thu lai."}</span>
          </div>
        </div>
      </Modal>

      <FloatingSupportMenu />
    </div>
  );
}

export default MyTripsPage;
