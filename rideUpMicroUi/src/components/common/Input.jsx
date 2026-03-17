function Input({ label, error, className = "", ...props }) {
  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      ) : null}
      <input
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
        {...props}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export default Input;
