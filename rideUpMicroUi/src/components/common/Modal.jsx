function Modal({ title, children, isOpen, onClose, isTopPriority = false }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 ${isTopPriority ? "z-[250]" : "z-50"} flex items-center justify-center bg-slate-950/60 p-4`}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
