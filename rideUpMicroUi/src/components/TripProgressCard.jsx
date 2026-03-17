import { FaCalendarAlt, FaMapMarkerAlt, FaPaperPlane, FaRegClock } from "react-icons/fa";

const statusConfig = {
  "Đang đi": "bg-orange-100 text-orange-500",
  "Sắp tới": "bg-sky-100 text-sky-500",
};

function TripProgressCard({ trip }) {
  const progress = Math.round((trip.seatsBooked / trip.seatsTotal) * 100);

  return (
    <article className="border-b border-slate-100 py-5 last:border-b-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <FaMapMarkerAlt className="text-orange-400" size={11} />
            {trip.from}
          </span>
          <span className="text-orange-500">→</span>
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

      <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1">
          <FaRegClock className="text-orange-400" />
          {trip.time}
        </span>
        <span className="inline-flex items-center gap-1">
          <FaCalendarAlt className="text-orange-400" />
          {trip.date}
        </span>
        <span className="inline-flex items-center gap-1">
          <FaPaperPlane className="text-orange-400" />
          {trip.distance}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
        <span>Đã đặt {trip.seatsBooked}/{trip.seatsTotal} chỗ</span>
        <span className="text-orange-500">{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${trip.status === "Đang đi" ? "bg-emerald-500" : "bg-orange-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-500">
        Doanh thu: <span className="text-orange-500">{trip.revenue}</span>
      </p>
    </article>
  );
}

export default TripProgressCard;
