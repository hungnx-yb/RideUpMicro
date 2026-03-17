import { FaCheckCircle } from "react-icons/fa";

function RecentActivities({ activities }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-4xl font-extrabold text-slate-800">Hoạt động gần đây</h2>

      <div className="mt-4 space-y-3">
        {activities.map((activity) => (
          <article
            key={activity.id}
            className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                <FaCheckCircle size={16} />
              </span>
              <div>
                <p className="text-base font-bold text-slate-700">{activity.route}</p>
                <p className="text-xs font-medium text-slate-500">
                  {activity.customers} khách • {activity.revenue}
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-400">{activity.date}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RecentActivities;
