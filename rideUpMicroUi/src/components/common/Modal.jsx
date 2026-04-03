function Modal({ title, children, isOpen, onClose, isTopPriority = false }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 ${isTopPriority ? "z-[250]" : "z-50"} flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]`}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
