import { FaStar } from "react-icons/fa";

function RatingCard({ rating, message }) {
  return (
    <section className="rounded-3xl bg-amber-500 p-5 text-white shadow-md">
      <p className="text-sm font-medium text-amber-100">Đánh giá của bạn</p>
      <p className="mt-2 flex items-center gap-2 text-4xl font-extrabold">
        {rating} <FaStar className="text-yellow-200" size={24} />
      </p>
      <p className="mt-2.5 text-sm text-amber-100">{message}</p>
    </section>
  );
}

export default RatingCard;
