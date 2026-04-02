function MonthlyStats({ monthlyStats }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900 p-3 text-white shadow-lg">
      <h3 className="mb-2 text-base font-extrabold">Tháng này</h3>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-xl bg-white/15 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="text-[11px]">Chuyến hoàn thành</span>
          <span className="text-sm font-bold">{monthlyStats.completedTrips}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/15 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="text-[11px]">Tổng khách hàng</span>
          <span className="text-sm font-bold">{monthlyStats.totalCustomers}</span>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-emerald-100">Doanh thu ước tính</p>
      <p className="text-lg font-extrabold tracking-tight">{monthlyStats.estimatedRevenue}</p>
    </section>
  );
}

export default MonthlyStats;
