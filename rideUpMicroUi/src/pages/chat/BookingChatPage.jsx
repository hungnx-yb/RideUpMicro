import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaPhone, FaReply, FaMapMarkerAlt, FaPaperclip, FaPaperPlane, FaUserCircle } from "react-icons/fa";
import CustomerNavbar from "../../components/CustomerNavbar";
import DriverNavbar from "../../components/DriverNavbar";
import useAuth from "../../hooks/useAuth";

function BookingChatPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { activeRole, user } = useAuth();
  const displayName = user?.fullName?.trim() || user?.email || "Tài xế";

  const messages = useMemo(
    () => [
      {
        id: 1,
        sender: "driver",
        text: "Tôi đã đến điểm đón, đang đứng cổng chính.",
        time: "09:12",
      },
      {
        id: 2,
        sender: "customer",
        text: "Em đang ra, khoảng 3 phút tới.",
        time: "09:13",
      },
      {
        id: 3,
        sender: "driver",
        text: "Ok em, anh chờ ở cổng. Em đi cẩn thận.",
        time: "09:14",
      },
      {
        id: 4,
        sender: "customer",
        text: "Em thấy xe rồi, em lại ngay.",
        time: "09:15",
      },
    ],
    []
  );

  const quickReplies = [
    "Em sẽ tới sau 5 phút",
    "Anh đang ở vị trí nào?",
    "OK anh, em tới ngay",
  ];

  return (
    <div
      className="relative min-h-screen bg-slate-50 text-slate-900"
      style={{
        "--chat-accent": "#16a34a",
        "--chat-accent-soft": "#22c55e",
        "--chat-ink": "#0f172a",
        "--chat-surface": "#ffffff",
      }}
    >
      {activeRole === "DRIVER" ? (
        <DriverNavbar driverName={displayName} tripsToday="" />
      ) : (
        <CustomerNavbar />
      )}

      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-20%] top-[-10%] h-80 w-80 rounded-full bg-emerald-200/60 blur-[120px]" />
          <div className="absolute right-[-10%] top-24 h-72 w-72 rounded-full bg-teal-200/50 blur-[120px]" />
          <div className="absolute bottom-[-12%] left-1/3 h-72 w-72 rounded-full bg-lime-200/40 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_55%)]" />
        </div>

        <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col gap-5 px-5 pb-5 pt-6">
          <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
          <aside className="flex w-full flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-emerald-100/60 backdrop-blur lg:w-80">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5"
              >
                <FaReply className="text-[11px]" />
                Quay lại
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">Ride chat</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/90 text-base font-semibold text-white shadow-lg shadow-emerald-200">
                <div className="flex h-full w-full items-center justify-center">D</div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Duy Tran</p>
                <p className="text-[11px] text-slate-500">Hyundai Solati · 16 chỗ</p>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Điểm đón</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FaMapMarkerAlt className="text-emerald-500" />
                Lotus Parking, Gate 2
              </p>
              <p className="text-[11px] text-slate-500">ETA 4 phút</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Điểm trả</p>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FaMapMarkerAlt className="text-rose-400" />
                Tân Sơn Nhất
              </p>
              <p className="text-[11px] text-slate-500">Hôm nay · 09:30 AM</p>
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-lg shadow-emerald-100/60">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Cuộc hội thoại</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Hôm nay</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <FaPhone className="text-[11px]" />
                  Gọi
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
              {messages.map((message, index) => {
                const isCustomer = message.sender === "customer";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-md chat-rise ${
                        isCustomer
                          ? "bg-[color:var(--chat-accent)] text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p className="leading-relaxed">{message.text}</p>
                      <p
                        className={`mt-2 text-right text-[10px] ${
                          isCustomer ? "text-white/70" : "text-slate-400"
                        }`}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-200"
                >
                  <FaReply className="text-[10px]" />
                  {reply}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Gửi cập nhật nhanh</span>
                <span>1 file đính kèm</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn"
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-200">
                    <FaPaperclip className="text-[11px]" />
                    Đính kèm
                    <input type="file" className="hidden" />
                  </label>
                  <button
                    type="button"
                    className="rounded-2xl bg-[color:var(--chat-accent)] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:-translate-y-0.5"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FaPaperPlane className="text-[11px]" />
                      Gửi
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingChatPage;
