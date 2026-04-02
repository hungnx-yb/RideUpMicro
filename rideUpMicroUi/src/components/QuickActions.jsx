import { FaArrowRight, FaChartLine, FaPlusCircle, FaRoute } from "react-icons/fa";

const iconByAction = {
  "Tạo chuyến mới": FaPlusCircle,
  "Quản lý chuyến": FaRoute,
  "Doanh thu": FaChartLine,
};

function QuickActions() {
  const actions = [
    { title: "Tạo chuyến mới", subtitle: "Thêm chuyến xe", color: "bg-emerald-500 text-white" },
    { title: "Quản lý chuyến", subtitle: "Xem tất cả", color: "bg-slate-100 text-slate-700" },
    { title: "Doanh thu", subtitle: "Thống kê chi tiết", color: "bg-emerald-100 text-emerald-600" },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-xl font-extrabold text-slate-800">Hành động nhanh</h3>
      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = iconByAction[action.title];

          return (
            <button
              key={action.title}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow"
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>
                  <Icon size={14} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-800">{action.title}</span>
                  <span className="block text-xs font-medium text-slate-400">{action.subtitle}</span>
                </span>
              </span>
              {index === 0 ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                  +
                </span>
              ) : (
                <FaArrowRight className="text-slate-300" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;
