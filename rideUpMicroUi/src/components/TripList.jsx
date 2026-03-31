import TripCard from "./TripCard";

function TripList({ trips, onOpenDetail }) {
  const featuredTags = ["Gia tiet kiem", "Don linh hoat", "Tai xe uy tin", "Con nhieu cho"];

  return (
    <section className="space-y-3.5">
      <header className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-sm font-bold text-white shadow-sm">
              GO
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Tim thay <span className="text-emerald-600">{trips.length}</span> chuyen phu hop
              </h2>
              <p className="text-xs text-slate-500">Danh sach duoc cap nhat ngay sau moi lan tim</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            Uu tien chuyen con tu 2 cho
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {featuredTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
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
        <div className="grid gap-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Chua tim thay chuyen phu hop</p>
          <p className="mt-1 text-sm text-slate-500">Thu doi khung ngay di hoac chon phuong xa gan trung tam hon.</p>
        </div>
      )}
    </section>
  );
}

export default TripList;
