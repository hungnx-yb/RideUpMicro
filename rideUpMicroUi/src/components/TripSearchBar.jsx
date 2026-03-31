import { useEffect, useState } from "react";
import { FaArrowRight, FaCalendarAlt, FaChevronDown, FaMapMarkerAlt, FaSearch, FaSpinner } from "react-icons/fa";

function LocationDropdown({
  value,
  options,
  placeholder,
  disabled,
  isLoading,
  onOpen,
  onChange,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      if (!event.target.closest("[data-location-dropdown]")) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = options.find((item) => item.id === value)?.name;

  return (
    <div className="relative" data-location-dropdown>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (typeof onOpen === "function") onOpen();
          setOpen((previous) => !previous);
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <span className={selectedLabel ? "text-slate-900" : "text-slate-500"}>
          {isLoading ? "Dang tai..." : selectedLabel || placeholder}
        </span>
        <FaChevronDown className={`text-xs text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-40 overflow-y-auto py-1">
            {options.length ? (
              options.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                    item.id === value ? "bg-orange-50 text-orange-700" : "text-slate-800"
                  }`}
                >
                  {item.name}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">Khong co du lieu</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TripSearchBar({
  form,
  onChange,
  onSubmit,
  onProvinceFocus,
  startProvinceOptions,
  endProvinceOptions,
  startWardOptions,
  endWardOptions,
  isLoadingStartWards,
  isLoadingEndWards,
  isSearching,
}) {
  return (
    <section className="w-full rounded-3xl border border-white/40 bg-white/95 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur-sm sm:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">RideUp now</p>
          <h2 className="text-lg font-extrabold text-slate-900">Ban muon di dau hom nay?</h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Danh sach cap nhat theo bo loc
        </span>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <div className="grid gap-2.5 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Tinh/Thanh di</span>
            <span className="relative block">
              <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600" />
              <LocationDropdown
                value={form.startProvinceId}
                onFocus={onProvinceFocus}
                onOpen={onProvinceFocus}
                onChange={(val) => onChange("startProvinceId", val)}
                options={startProvinceOptions}
                placeholder="Chon tinh/thanh di"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Phuong/Xa di</span>
            <span className="relative block">
              <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600" />
              <LocationDropdown
                value={form.startWardId}
                onChange={(val) => onChange("startWardId", val)}
                options={startWardOptions}
                placeholder="Chon phuong/xa di"
                disabled={!form.startProvinceId || isLoadingStartWards}
                isLoading={isLoadingStartWards}
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Tinh/Thanh den</span>
            <span className="relative block">
              <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500" />
              <LocationDropdown
                value={form.endProvinceId}
                onOpen={onProvinceFocus}
                onChange={(val) => onChange("endProvinceId", val)}
                options={endProvinceOptions}
                placeholder="Chon tinh/thanh den"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Phuong/Xa den</span>
            <span className="relative block">
              <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500" />
              <LocationDropdown
                value={form.endWardId}
                onChange={(val) => onChange("endWardId", val)}
                options={endWardOptions}
                placeholder="Chon phuong/xa den"
                disabled={!form.endProvinceId || isLoadingEndWards}
                isLoading={isLoadingEndWards}
              />
            </span>
          </label>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Ngay di</span>
          <span className="relative block">
            <FaCalendarAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600" />
            <input
              type="date"
              value={form.date}
              onChange={(event) => onChange("date", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </span>
          </label>

          <button
            type="submit"
            disabled={isSearching || !form.startWardId || !form.endWardId}
            className="mt-auto inline-flex h-[42px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSearching ? <FaSpinner className="text-xs animate-spin" /> : <FaSearch className="text-xs" />}
            {isSearching ? "Dang tim..." : "Tim chuyen"}
            {!isSearching ? <FaArrowRight className="text-[10px]" /> : null}
          </button>
        </div>
      </form>
    </section>
  );
}

export default TripSearchBar;
