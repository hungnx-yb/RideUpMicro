import { FaBell } from "react-icons/fa";
import { ModalShell } from "./AdminUi";

/**
 * Xem trước thông báo hiển thị trong hòm thư ứng dụng (Inbox).
 */
function MobilePreviewModal({ draft, onClose }) {
  return (
    <ModalShell title="Xem trước thông báo trong App" onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
          Hòm thư trong ứng dụng (Inbox)
        </p>
        <div className="h-[460px] w-[260px] overflow-hidden rounded-[2.5rem] border-[7px] border-slate-800 bg-slate-50 shadow-2xl">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-bold text-white shadow">
            <FaBell className="mr-1.5 inline" /> Thông báo
          </div>
          <div className="space-y-3 p-3">
            <div className="rounded-2xl border border-orange-200 bg-white p-3 shadow-sm">
              <p className="text-sm font-bold text-slate-900">{draft.title || "Tiêu đề thông báo"}</p>
              <p className="mt-1.5 max-h-[300px] overflow-hidden whitespace-pre-line text-xs leading-relaxed text-slate-600">
                {draft.content || "Nội dung chi tiết thông báo..."}
              </p>
            </div>
            <div className="h-12 rounded-xl bg-white/70 border border-slate-100" />
            <div className="h-12 rounded-xl bg-white/50 border border-slate-100" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default MobilePreviewModal;
