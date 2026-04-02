import { FaCalendarAlt, FaMapMarkerAlt, FaPaperPlane, FaRegClock } from "react-icons/fa";

const statusConfig = {
  "Đang đi": "bg-emerald-100 text-emerald-700",
  "Sắp tới": "bg-slate-100 text-slate-700",
};

function TripProgressCard({ trip }) {
  const progress = Math.round((trip.seatsBooked / trip.seatsTotal) * 100);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-sm">
      <span
        className={`absolute inset-y-0 left-0 w-1.5 ${trip.status === "Đang đi" ? "bg-emerald-500" : "bg-slate-400"}`}
        aria-hidden="true"
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 pl-2 text-sm font-bold text-slate-700">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <FaMapMarkerAlt className="text-emerald-500" size={11} />
            {trip.from}
          </span>
          <span className="text-slate-400">→</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <FaMapMarkerAlt className="text-rose-400" size={11} />
            {trip.to}
          </span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            statusConfig[trip.status] || "bg-slate-100 text-slate-500"
          }`}
        >
          {trip.status}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-4 pl-2 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1">
          <FaRegClock className="text-emerald-500" />
          {trip.time}
        </span>
        <span className="inline-flex items-center gap-1">
          <FaCalendarAlt className="text-emerald-500" />
          {trip.date}
        </span>
        <span className="inline-flex items-center gap-1">
          <FaPaperPlane className="text-emerald-500" />
          {trip.distance}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between pl-2 text-sm font-semibold text-slate-600">
        <span>Đã đặt {trip.seatsBooked}/{trip.seatsTotal} chỗ</span>
        <span className="text-emerald-600">{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 ml-2">
        <div
          className={`h-2 rounded-full ${trip.status === "Đang đi" ? "bg-emerald-500" : "bg-slate-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 pl-2 text-sm font-semibold text-slate-500">
        Doanh thu: <span className="text-emerald-600">{trip.revenue}</span>
      </p>
    </article>
  );
}

export default TripProgressCard;
