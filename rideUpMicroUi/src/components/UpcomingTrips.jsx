import TripProgressCard from "./TripProgressCard";

function UpcomingTrips({ trips }) {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-md shadow-emerald-100/60 ring-1 ring-emerald-100">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            Ưu tiên vận hành
          </p>
          <h2 className="text-2xl font-extrabold text-slate-800">Chuyến xe sắp tới</h2>
          <p className="text-sm font-medium text-slate-500">{trips.length} chuyến đang hoạt động</p>
        </div>
        <button type="button" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
          Xem tất cả
        </button>
      </div>

      <div className="space-y-3">
        {trips.map((trip) => (
          <TripProgressCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default UpcomingTrips;
