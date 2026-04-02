import { FaStar } from "react-icons/fa";

function RatingCard({ rating, message }) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-slate-900 shadow-sm">
      <p className="text-xs font-medium text-emerald-700">Đánh giá của bạn</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-xl font-extrabold">
        {rating} <FaStar className="text-amber-400" size={16} />
      </p>
      <p className="mt-1.5 text-xs text-slate-600">{message}</p>
    </section>
  );
}

export default RatingCard;
