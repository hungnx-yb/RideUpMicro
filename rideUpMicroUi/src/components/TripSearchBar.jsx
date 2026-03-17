import { FaCalendarAlt, FaMapMarkerAlt, FaSearch } from "react-icons/fa";

function TripSearchBar({ form, onChange, onSubmit }) {
  return (
    <section className="w-full rounded-2xl bg-white p-4 shadow-xl shadow-black/20 sm:p-5">
      <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Điểm xuất phát</span>
          <span className="relative block">
            <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-orange-500" />
            <input
              type="text"
              value={form.origin}
              onChange={(event) => onChange("origin", event.target.value)}
              placeholder="Nhập điểm xuất phát"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Điểm đến</span>
          <span className="relative block">
            <FaMapMarkerAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-red-400" />
            <input
              type="text"
              value={form.destination}
              onChange={(event) => onChange("destination", event.target.value)}
              placeholder="Nhập điểm đến"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Ngày đi</span>
          <span className="relative block">
            <FaCalendarAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-orange-500" />
            <input
              type="date"
              value={form.date}
              onChange={(event) => onChange("date", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </span>
        </label>

        <button
          type="submit"
          className="mt-auto inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <FaSearch className="text-xs" />
          Tìm kiếm
        </button>
      </form>
    </section>
  );
}

export default TripSearchBar;
