import TripCard from "./TripCard";

function TripList({ trips }) {
  return (
    <section className="space-y-4">
      <header className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white">
          ↔
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Tìm thấy <span className="text-orange-600">{trips.length}</span> chuyến xe
          </h2>
          <p className="text-xs text-slate-500">Phù hợp với tìm kiếm của bạn</p>
        </div>
      </header>

      <div className="grid gap-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
}

export default TripList;
