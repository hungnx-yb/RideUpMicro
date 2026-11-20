import { useCallback, useEffect, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from "react-icons/fa";

/** Định dạng tiền VNĐ */
export function formatVnd(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("vi-VN")} đ`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("vi-VN");
}

/** Toast thông báo góc màn hình, tự ẩn sau 4 giây */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const toastElement = toast ? (
    <div className="fixed bottom-5 right-5 z-[60] max-w-sm" role="status" aria-live="polite">
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${
          toast.type === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        {toast.type === "error" ? <FaExclamationTriangle className="mt-0.5 shrink-0" /> : <FaCheckCircle className="mt-0.5 shrink-0" />}
        <span className="flex-1">{toast.message}</span>
        <button type="button" onClick={() => setToast(null)} className="opacity-60 hover:opacity-100" aria-label="Đóng">
          <FaTimes />
        </button>
      </div>
    </div>
  ) : null;

  return { showToast, toastElement };
}

export function Card({ title, description, icon: Icon, actions, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      {title ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              {Icon ? <Icon className="text-orange-500" /> : null}
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function KpiCard({ icon: Icon, label, value, hint, tone = "orange" }) {
  const tones = {
    orange: "from-orange-500 to-amber-500",
    blue: "from-sky-500 to-blue-600",
    red: "from-rose-500 to-red-600",
    emerald: "from-emerald-500 to-teal-500",
  };
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {Icon ? (
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow ${tones[tone] || tones.orange}`}>
            <Icon />
          </span>
        ) : null}
      </div>
      <p className="mt-3 break-words text-2xl font-extrabold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100";

export function Button({ variant = "primary", className = "", children, ...props }) {
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-200 hover:brightness-105",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ tone = "slate", children }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export function ModalShell({ title, onClose, children, footer, maxWidth = "max-w-2xl" }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={`relative flex max-h-[90vh] w-full ${maxWidth} flex-col rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Đóng">
            <FaTimes />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-slate-100 px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
