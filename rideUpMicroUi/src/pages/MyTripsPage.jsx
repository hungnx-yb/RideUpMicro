import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaCommentDots,
  FaMapMarkerAlt,
  FaRegClock,
  FaSuitcase,
  FaTimesCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
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

const CANCEL_REASON_OPTIONS = [
  "Thay đổi kế hoạch",
  "Đặt nhầm chuyến",
  "Thời gian không còn phù hợp",
  "Tìm được phương án di chuyển khác",
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

function getPaymentStatusMeta(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PAID" || normalized === "SUCCESS") {
    return {
      label: "Đã thanh toán",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: <FaCheckCircle className="text-[11px]" />,
    };
  }

  if (normalized === "PENDING" || normalized === "PENDING_PAYMENT") {
    return {
      label: "Chờ thanh toán",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: <FaRegClock className="text-[11px]" />,
    };
  }

  if (normalized === "FAILED" || normalized === "CANCELLED" || normalized === "EXPIRED") {
    return {
      label: "Thanh toán thất bại",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      icon: <FaTimesCircle className="text-[11px]" />,
    };
  }

  return {
    label: "Chưa rõ",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    icon: <FaExclamationCircle className="text-[11px]" />,
  };
}

function mapBookingToView(booking) {
  const bookingStatus = booking?.status || "UNKNOWN";
  const normalizedBookingStatus = String(bookingStatus).toUpperCase();
  const fallbackPaymentStatus =
    normalizedBookingStatus === "CONFIRMED" || normalizedBookingStatus === "RESERVED"
      ? "PAID"
      : normalizedBookingStatus === "PENDING_PAYMENT"
        ? "PENDING"
        : normalizedBookingStatus === "CANCELLED" || normalizedBookingStatus === "EXPIRED"
          ? "FAILED"
          : "UNKNOWN";

  return {
    id: booking?.id || "",
    status: bookingStatus,
    paymentStatus: booking?.paymentStatus || booking?.paymentState || booking?.payment?.status || fallbackPaymentStatus,
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
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTargetBookingId, setCancelTargetBookingId] = useState("");
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
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

  const cancelTargetBooking = useMemo(() => {
    if (!cancelTargetBookingId) {
      return null;
    }

    return bookings.find((item) => item.id === cancelTargetBookingId) || null;
  }, [bookings, cancelTargetBookingId]);

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
    return normalized === "PENDING_PAYMENT" || normalized === "RESERVED" || normalized === "CONFIRMED";
  };

  const openCancelModal = (bookingId) => {
    if (!bookingId) {
      return;
    }

    setCancelTargetBookingId(bookingId);
    setSelectedCancelReason("");
    setCustomCancelReason("");
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setCancelTargetBookingId("");
    setSelectedCancelReason("");
    setCustomCancelReason("");
  };

  const handleCancelBooking = async () => {
    if (!cancelTargetBookingId || isCancelling) {
      return;
    }

    const finalReason = customCancelReason.trim() || selectedCancelReason.trim();
    if (!finalReason) {
      setErrorModalMessage("Vui lòng chọn hoặc nhập lý do hủy vé.");
      setIsErrorModalOpen(true);
      return;
    }

    try {
      setIsCancelling(true);
      setSuccessMessage("");
      await cancelBookingApi(cancelTargetBookingId, finalReason);
      setSuccessMessage("Hủy chuyến thành công. Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.");
      closeCancelModal();
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

  const canSubmitCancel = Boolean(customCancelReason.trim() || selectedCancelReason.trim()) && !isCancelling;

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
                const paymentMeta = getPaymentStatusMeta(booking.paymentStatus);

                return (
                  <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                          {statusMeta.icon}
                          {statusMeta.label}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentMeta.className}`}>
                          {paymentMeta.icon}
                          {paymentMeta.label}
                        </span>
                      </div>

                      {String(booking.status || "").toUpperCase() === "CONFIRMED" ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/chat/${booking.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <FaCommentDots className="text-[12px]" />
                          Chat ngay
                        </button>
                      ) : null}

                      {canCancelBooking(booking.status) ? (
                        <button
                          type="button"
                          onClick={() => openCancelModal(booking.id)}
                          disabled={isCancelling}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isCancelling ? "Đang hủy vé..." : "Hủy vé"}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điểm đón</p>
                        <p className="mt-1 font-medium text-slate-900">{booking.pickupAddressText}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điểm trả</p>
                        <p className="mt-1 font-medium text-slate-900">{booking.dropoffAddressText}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giá</p>
                        <p className="mt-1 font-bold text-emerald-600">{formatMoneyVnd(booking.totalAmount)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Số ghế</p>
                        <p className="mt-1 font-semibold text-slate-900">{booking.seatCount} chỗ</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hạn thanh toán</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatDateTime(booking.expiresAt)}</p>
                      </div>
                    </div>

                    {String(booking.status || "").toUpperCase() === "CANCELLED" && booking.cancelReason ? (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Lý do hủy: {booking.cancelReason}
                      </div>
                    ) : null}

                    {booking.note ? (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Ghi chú: {booking.note}
                      </div>
                    ) : null}
                  </article>
                );
              })
            : null}
        </section>
      </main>

      <Modal title="Hủy vé" isOpen={isCancelModalOpen} onClose={closeCancelModal} isTopPriority>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Chọn một lý do hủy phổ biến hoặc nhập lý do riêng.</p>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Lưu ý: vé đã thanh toán có thể được xử lý hoàn tiền theo chính sách hiện hành.
          </div>

          {cancelTargetBooking ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chuyến sẽ hủy</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-900">
                {cancelTargetBooking.pickupAddressText} {"->"} {cancelTargetBooking.dropoffAddressText}
              </p>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {CANCEL_REASON_OPTIONS.map((reason) => {
              const isSelected = selectedCancelReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedCancelReason(reason)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`h-3.5 w-3.5 rounded-full border ${
                        isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                      }`}
                    />
                    {reason}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lý do khác (tuỳ chọn)</label>
            <textarea
              rows={3}
              value={customCancelReason}
              onChange={(event) => setCustomCancelReason(event.target.value)}
              placeholder="Nhập lý do của bạn..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-300"
            />
            <p className="mt-1 text-xs text-slate-500">Lý do đã nhập sẽ được gửi cho hệ thống khi hủy vé.</p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeCancelModal}
              disabled={isCancelling}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleCancelBooking}
              disabled={!canSubmitCancel}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelling ? "Đang hủy..." : "Xác nhận hủy vé"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Có lỗi xảy ra" isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} isTopPriority>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <div className="inline-flex items-start gap-2">
            <FaExclamationCircle className="mt-0.5 text-red-500" />
            <span>{errorModalMessage || "Đã có lỗi xảy ra. Vui lòng thử lại."}</span>
          </div>
        </div>
      </Modal>

      <FloatingSupportMenu />
    </div>
  );
}

export default MyTripsPage;
