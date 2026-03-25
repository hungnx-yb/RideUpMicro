import TripCard from "./TripCard";

function TripList({ trips, onOpenDetail }) {
  const featuredTags = ["Gia tot", "Don linh hoat", "Tai xe xac minh", "Con nhieu cho"];

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 text-white shadow-sm">
            ↔
          </span>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Tim thay <span className="text-orange-600">{trips.length}</span> chuyen xe
            </h2>
            <p className="text-xs text-slate-500">Ket qua duoc cap nhat theo bo loc hien tai</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {featuredTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Goi y: Nen uu tien chuyen co gio xuat phat phu hop va con tu 2 cho trong tro len de linh hoat doi lich.
        </div>
      </header>

      {trips.length ? (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Khong co chuyen phu hop</p>
          <p className="mt-1 text-sm text-slate-500">Hay thu doi diem di, diem den hoac ngay de xem them ket qua.</p>
        </div>
      )}
    </section>
  );
}

export default TripList;
