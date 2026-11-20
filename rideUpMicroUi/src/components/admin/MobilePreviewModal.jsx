import { FaBell, FaTaxi } from "react-icons/fa";
import { ModalShell } from "./AdminUi";

/**
 * Xem trước thông báo trên giao diện điện thoại: màn hình khóa (push) và hòm thư trong app.
 */
function MobilePreviewModal({ draft, onClose }) {
  const now = new Date();
  const time = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <ModalShell title="Xem trước giao diện điện thoại" onClose={onClose} maxWidth="max-w-3xl">
      <div className="grid justify-items-center gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">Màn hình khóa</p>
          <div className="h-[420px] w-[220px] rounded-[2rem] border-[6px] border-slate-800 bg-gradient-to-b from-indigo-500 via-purple-500 to-orange-400 p-3 shadow-xl">
            <p className="mt-6 text-center text-4xl font-light text-white">{time}</p>
            <p className="text-center text-xs text-white/80">{now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}</p>
            <div className="mt-6 rounded-2xl bg-white/85 p-3 backdrop-blur">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                <FaTaxi className="text-orange-500" /> RideUp · bây giờ
              </div>
              <p className="mt-1 text-xs font-bold text-slate-900">{draft.title || "Tiêu đề thông báo"}</p>
              <p className="mt-0.5 line-clamp-3 text-[11px] text-slate-700">{draft.summary || "Tóm tắt hiển thị trên màn hình khóa"}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">Hòm thư trong ứng dụng</p>
          <div className="h-[420px] w-[220px] overflow-hidden rounded-[2rem] border-[6px] border-slate-800 bg-slate-50 shadow-xl">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-3 text-sm font-bold text-white">
              <FaBell className="mr-1 inline" /> Thông báo
            </div>
            <div className="space-y-2 p-2">
              <div className="rounded-xl border border-orange-200 bg-white p-2.5 shadow-sm">
                <p className="text-xs font-bold text-slate-900">{draft.title || "Tiêu đề thông báo"}</p>
                <p className="mt-1 max-h-[250px] overflow-hidden whitespace-pre-line text-[11px] leading-relaxed text-slate-600">
                  {draft.content || draft.summary || "Nội dung chi tiết"}
                </p>
                {draft.deepLink ? (
                  <p className="mt-2 truncate text-[10px] font-semibold text-orange-600">↗ {draft.deepLink}</p>
                ) : null}
              </div>
              <div className="h-10 rounded-xl bg-white/60" />
              <div className="h-10 rounded-xl bg-white/40" />
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default MobilePreviewModal;
