import { FaCarSide, FaDollarSign, FaStar, FaUsers } from "react-icons/fa";

const statConfig = [
  {
    key: "totalTrips",
    label: "Tổng chuyến xe",
    icon: FaCarSide,
    iconClass: "bg-slate-900 text-white",
    accentClass: "bg-slate-100 text-slate-500",
  },
  {
    key: "bookedCustomers",
    label: "Khách đã đặt",
    icon: FaUsers,
    iconClass: "bg-emerald-100 text-emerald-600",
    accentClass: "bg-emerald-50 text-emerald-500",
  },
  {
    key: "totalRevenue",
    label: "Tổng doanh thu",
    icon: FaDollarSign,
    iconClass: "bg-emerald-100 text-emerald-600",
    accentClass: "bg-emerald-50 text-emerald-500",
  },
  {
    key: "averageRating",
    label: "Đánh giá TB",
    icon: FaStar,
    iconClass: "bg-slate-100 text-slate-700",
    accentClass: "bg-slate-100 text-slate-500",
  },
];

function DashboardStats({ statistics }) {
  return (
    <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {statConfig.map((item) => {
        const data = statistics[item.key];
        const Icon = item.icon;

        return (
          <article
            key={item.key}
            className="rounded-[14px] border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.iconClass}`}>
                <Icon size={12} />
              </span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${item.accentClass}`}>↗</span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-xl leading-none font-extrabold tracking-tight text-slate-900">{data.value}</p>
            <p className="mt-1 text-[10px] font-medium text-slate-400">{data.description}</p>
          </article>
        );
      })}
    </section>
  );
}

export default DashboardStats;
