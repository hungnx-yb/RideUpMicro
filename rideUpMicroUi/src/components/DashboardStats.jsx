import { FaCarSide, FaDollarSign, FaStar, FaUsers } from "react-icons/fa";

const statConfig = [
  {
    key: "totalTrips",
    label: "Tổng chuyến xe",
    icon: FaCarSide,
    iconClass: "bg-sky-100 text-sky-500",
    accentClass: "bg-sky-50 text-sky-400",
  },
  {
    key: "bookedCustomers",
    label: "Khách đã đặt",
    icon: FaUsers,
    iconClass: "bg-fuchsia-100 text-fuchsia-500",
    accentClass: "bg-fuchsia-50 text-fuchsia-400",
  },
  {
    key: "totalRevenue",
    label: "Tổng doanh thu",
    icon: FaDollarSign,
    iconClass: "bg-emerald-100 text-emerald-500",
    accentClass: "bg-emerald-50 text-emerald-400",
  },
  {
    key: "averageRating",
    label: "Đánh giá TB",
    icon: FaStar,
    iconClass: "bg-amber-100 text-amber-500",
    accentClass: "bg-amber-50 text-amber-400",
  },
];

function DashboardStats({ statistics }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {statConfig.map((item) => {
        const data = statistics[item.key];
        const Icon = item.icon;

        return (
          <article
            key={item.key}
            className="rounded-[28px] border border-slate-200 bg-white px-7 py-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.iconClass}`}>
                <Icon size={20} />
              </span>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${item.accentClass}`}>↗</span>
            </div>
            <p className="text-base font-semibold text-slate-600">{item.label}</p>
            <p className="mt-1 text-5xl font-extrabold tracking-tight text-slate-900">{data.value}</p>
            <p className="mt-2 text-sm font-medium text-slate-400">{data.description}</p>
          </article>
        );
      })}
    </section>
  );
}

export default DashboardStats;
