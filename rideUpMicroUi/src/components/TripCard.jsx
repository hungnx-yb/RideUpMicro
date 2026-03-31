import { FaArrowRight, FaClock, FaMapMarkerAlt, FaUserFriends } from "react-icons/fa";
import DriverInfo from "./DriverInfo";

function TripCard({ trip, onOpenDetail }) {
  const handleOpenDetail = () => {
    if (typeof onOpenDetail === "function") {
      onOpenDetail(trip);
    }
  };

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
      onClick={handleOpenDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpenDetail();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 via-white to-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-[10px] font-bold text-white">
            GO
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-900">
              {trip.origin}
              <FaArrowRight className="mx-1 inline text-[10px] text-emerald-500" />
              {trip.destination}
            </p>
            <p className="text-xs text-slate-500">{trip.duration} • Khoi hanh {trip.departureTime}</p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white px-3 py-1.5 text-right">
          <p className="text-lg font-extrabold text-emerald-600">{trip.price}</p>
          <p className="text-xs text-slate-500">/hanh khach</p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_250px]">
          <div className="space-y-3.5">
            <DriverInfo driver={trip.driver} />

            <div className="grid gap-2.5 rounded-2xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white p-2.5">
                <p className="mb-1.5 font-semibold text-slate-700">Điểm đón</p>
                <ul className="space-y-1.5 text-slate-600">
                  {trip.pickupPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-xs sm:text-sm">
                      <FaMapMarkerAlt className="mt-0.5 text-[10px] text-emerald-500" />
                      <span className="line-clamp-2">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-white p-2.5">
                <p className="mb-1.5 font-semibold text-slate-700">Điểm trả</p>
                <ul className="space-y-1.5 text-slate-600">
                  {trip.dropoffPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-xs sm:text-sm">
                      <FaMapMarkerAlt className="mt-0.5 text-[10px] text-red-400" />
                      <span className="line-clamp-2">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="space-y-2.5">
              <div className="rounded-xl bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Gio xuat phat</p>
                <p className="text-base font-bold text-slate-900">{trip.departureTime}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Cho trong</p>
                <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                  <FaUserFriends className="text-xs" />
                  {trip.availableSeats}/{trip.totalSeats}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleOpenDetail();
              }}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Đặt chỗ ngay 
              <FaArrowRight className="text-[10px]" />
            </button>
          </aside>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <FaClock />
          <span>{trip.note}</span>
        </div>
      </div>
    </article>
  );
}

export default TripCard;
