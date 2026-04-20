import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCheckCircle,
  FaClock,
  FaEnvelopeOpenText,
  FaMapMarkerAlt,
  FaRegBell,
} from "react-icons/fa";
import CustomerNavbar from "../components/CustomerNavbar";
import DriverNavbar from "../components/DriverNavbar";
import useAuth from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/authApi";
import {
  getUnreadNotificationCountApi,
  listNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "../services/notificationApi";
import { useNotificationSocket } from "../context/NotificationSocketContext";

const PAGE_SIZE = 10;

function parseMetadata(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function getTypeLabel(type) {
  switch (type) {
    case "BOOKING_CONFIRMED":
      return "Xac nhan dat cho";
    case "BOOKING_CANCELLED":
      return "Huy dat cho";
    case "PAYMENT_SUCCESS":
      return "Thanh toan thanh cong";
    case "PAYMENT_FAILED":
      return "Thanh toan that bai";
    case "TRIP_REMINDER":
      return "Nhac chuyen";
    case "SYSTEM":
      return "He thong";
    default:
      return "Thong bao";
  }
}

function getTypeTone(type) {
  switch (type) {
    case "BOOKING_CONFIRMED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "BOOKING_CANCELLED":
      return "bg-rose-50 text-rose-600 border-rose-200";
    case "PAYMENT_FAILED":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "PAYMENT_SUCCESS":
      return "bg-sky-50 text-sky-700 border-sky-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function NotificationsPage() {
  const { activeRole, user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName?.trim() || user?.email || "Nguoi dung";

  const {
    unreadCount,
    lastNotification,
    setUnreadCount,
    refreshUnreadCount,
  } = useNotificationSocket() || {};

  const [notifications, setNotifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const unreadLabel = useMemo(() => {
    const count = Number.isFinite(unreadCount) ? unreadCount : 0;
    return count > 99 ? "99+" : `${count}`;
  }, [unreadCount]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await listNotificationsApi({
          page: 0,
          size: PAGE_SIZE,
          status: statusFilter === "UNREAD" ? "UNREAD" : undefined,
        });
        if (!isMounted) {
          return;
        }
        setNotifications(response.items || []);
        setPage(1);
        setHasMore((response.items || []).length >= PAGE_SIZE);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(getApiErrorMessage(error, "Khong tai duoc thong bao."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    if (!lastNotification) {
      return;
    }

    if (statusFilter === "UNREAD" && lastNotification.status !== "UNREAD") {
      return;
    }

    setNotifications((prev) => [lastNotification, ...prev]);
  }, [lastNotification, statusFilter]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage("");

    try {
      const response = await listNotificationsApi({
        page,
        size: PAGE_SIZE,
        status: statusFilter === "UNREAD" ? "UNREAD" : undefined,
      });
      setNotifications((prev) => [...prev, ...(response.items || [])]);
      setPage((prev) => prev + 1);
      setHasMore((response.items || []).length >= PAGE_SIZE);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Khong tai them thong bao."));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      const updated = await markNotificationReadApi(notificationId);
      if (!updated) {
        return;
      }
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, ...updated } : item))
      );
      if (updated.status === "READ") {
        setUnreadCount?.((prev) => Math.max(Number(prev || 0) - 1, 0));
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Khong the danh dau da doc."));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const marked = await markAllNotificationsReadApi();
      if (marked > 0) {
        setNotifications((prev) =>
          prev.map((item) => (item.status === "UNREAD" ? { ...item, status: "READ" } : item))
        );
      }
      await refreshUnreadCount?.();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Khong the danh dau tat ca."));
    }
  };

  const handleRefreshCount = async () => {
    try {
      const count = await getUnreadNotificationCountApi();
      setUnreadCount?.(count);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Khong the cap nhat so thong bao."));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {activeRole === "DRIVER" ? (
        <DriverNavbar driverName={displayName} tripsToday="" />
      ) : (
        <CustomerNavbar />
      )}

      <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">Thong bao</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Hop thong bao</h1>
            <p className="mt-2 text-sm text-slate-500">
              Cap nhat cac su kien moi ve dat cho, thanh toan va he thong.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshCount}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600"
            >
              <FaRegBell className="text-[11px]" />
              Cap nhat
            </button>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              <FaCheckCircle className="text-[11px]" />
              Danh dau tat ca
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {[
            { key: "ALL", label: "Tat ca" },
            { key: "UNREAD", label: "Chua doc" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                statusFilter === item.key
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-600"
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
            <FaBell className="text-[11px]" />
            {unreadLabel} chua doc
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Dang tai thong bao...
            </div>
          ) : null}

          {!isLoading && notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Chua co thong bao nao.
            </div>
          ) : null}

          {notifications.map((item) => {
            const metadata = parseMetadata(item.metadata);
            const bookingId = metadata?.bookingId;
            const tripId = metadata?.tripId;
            const isUnread = item.status === "UNREAD";

            return (
              <article
                key={item.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isUnread ? "border-orange-200" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase ${
                          getTypeTone(item.type)
                        }`}
                      >
                        <FaEnvelopeOpenText className="text-[11px]" />
                        {getTypeLabel(item.type)}
                      </span>
                      {isUnread ? (
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-600">
                          Moi
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>

                    {(bookingId || tripId) ? (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        {bookingId ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                            <FaMapMarkerAlt className="text-[10px]" />
                            Booking: {bookingId}
                          </span>
                        ) : null}
                        {tripId ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                            <FaMapMarkerAlt className="text-[10px]" />
                            Trip: {tripId}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-start gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <FaClock className="text-[11px]" />
                      {formatDateTime(item.createdAt)}
                    </span>
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(item.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700 transition hover:bg-orange-100"
                      >
                        <FaCheckCircle className="text-[10px]" />
                        Danh dau da doc
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400">Da doc</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {hasMore ? (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600"
            >
              {isLoadingMore ? "Dang tai..." : "Tai them"}
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default NotificationsPage;
