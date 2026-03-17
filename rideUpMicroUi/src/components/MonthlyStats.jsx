function MonthlyStats({ monthlyStats }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-red-500 via-orange-500 to-orange-400 p-5 text-white shadow-lg">
      <h3 className="mb-3 text-3xl font-extrabold">Tháng này</h3>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
          <span className="text-sm">Chuyến hoàn thành</span>
          <span className="text-2xl font-bold">{monthlyStats.completedTrips}</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
          <span className="text-sm">Tổng khách hàng</span>
          <span className="text-2xl font-bold">{monthlyStats.totalCustomers}</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-orange-100">Doanh thu ước tính</p>
      <p className="text-4xl font-extrabold tracking-tight">{monthlyStats.estimatedRevenue}</p>
    </section>
  );
}

export default MonthlyStats;
