import { FaRoute, FaUsers, FaMapMarkerAlt, FaStar } from "react-icons/fa";

const stats = [
  {
    icon: FaRoute,
    value: "12,800+",
    label: "Chuyến hoàn thành",
  },
  {
    icon: FaUsers,
    value: "320+",
    label: "Tài xế uy tín",
  },
  {
    icon: FaMapMarkerAlt,
    value: "45+",
    label: "Tuyến đường",
  },
  {
    icon: FaStar,
    value: "4.8",
    label: "Đánh giá trung bình",
  },
];

function StatsSection() {
  return (
    <section className="bg-gradient-to-r from-orange-600 to-red-500 py-6 text-white sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-5 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
        {stats.map((item, index) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className="reveal-on-scroll rounded-xl bg-white/5 p-3 text-center ring-1 ring-white/15 sm:p-4"
              style={{ "--reveal-delay": `${(index + 1) * 90}ms` }}
            >
              <Icon className="mx-auto mb-2 text-sm text-orange-100 sm:text-base" />
              <p className="text-2xl font-bold sm:text-3xl">{item.value}</p>
              <p className="mt-1 text-xs text-orange-100 sm:text-sm">{item.label}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default StatsSection;
