import { FaClock, FaMapMarkerAlt } from "react-icons/fa";
import DriverInfo from "./DriverInfo";

function TripCard({ trip, onOpenDetail }) {
  const handleOpenDetail = () => {
    if (typeof onOpenDetail === "function") {
      onOpenDetail(trip);
    }
  };

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
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
      <div className="flex flex-col gap-2.5 border-b border-slate-100 bg-gradient-to-r from-orange-50/60 to-red-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-semibold text-slate-800">
            {trip.origin}
          </span>
          <span className="text-orange-500">{"->"}</span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-semibold text-slate-800">
            {trip.destination}
          </span>
          <span className="text-xs text-slate-500">{trip.distance}</span>
          <span className="text-xs text-slate-500">• {trip.duration}</span>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white px-3.5 py-1.5 text-right">
          <p className="text-xl font-extrabold text-orange-600">{trip.price}</p>
          <p className="text-xs text-slate-500">mỗi khách</p>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
          <div className="space-y-4">
            <DriverInfo driver={trip.driver} />

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold text-slate-700">Điểm đón</p>
                <ul className="space-y-1 text-slate-600">
                  {trip.pickupPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <FaMapMarkerAlt className="mt-0.5 text-[10px] text-orange-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-1 font-semibold text-slate-700">Điểm trả</p>
                <ul className="space-y-1 text-slate-600">
                  {trip.dropoffPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <FaMapMarkerAlt className="mt-0.5 text-[10px] text-red-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="flex h-full flex-col justify-between rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500">Giờ xuất phát</p>
                <p className="text-lg font-bold text-slate-800">{trip.departureTime}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Chỗ trống</p>
                <p className="font-semibold text-emerald-600">
                  {trip.availableSeats}/{trip.totalSeats}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenDetail}
              className="mt-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Đặt chỗ ngay
            </button>
          </aside>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <FaClock />
          <span>{trip.note}</span>
        </div>
      </div>
    </article>
  );
}

export default TripCard;
