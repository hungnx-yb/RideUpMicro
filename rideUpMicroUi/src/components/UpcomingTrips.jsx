import TripProgressCard from "./TripProgressCard";

function UpcomingTrips({ trips }) {
  return (
    <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">Chuyến xe sắp tới</h2>
          <p className="text-sm font-medium text-slate-400">{trips.length} chuyến đang hoạt động</p>
        </div>
        <button type="button" className="text-sm font-bold text-orange-500 hover:text-orange-600">
          Xem tất cả
        </button>
      </div>

      <div>
        {trips.map((trip) => (
          <TripProgressCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default UpcomingTrips;
