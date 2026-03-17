import { useEffect, useState } from "react";
import { FaCalendarAlt, FaCar, FaChartLine } from "react-icons/fa";
import Loading from "../../components/common/Loading";
import { getDashboardSummary } from "../../services/dashboardApi";
import { formatDate } from "../../utils/formatDate";

function StatCard({ icon, label, value }) {
  return (
    <article className="card">
      <div className="mb-2 text-xl text-brand-500">{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await getDashboardSummary();
        setSummary(response.data);
      } catch {
        setSummary({
          totalRides: 128,
          activeDrivers: 24,
          growthRate: "12%",
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <section className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        {summary?.updatedAt ? (
          <p className="text-sm text-slate-500">Updated: {formatDate(summary.updatedAt)}</p>
        ) : null}
      </section>

      {isLoading ? (
        <Loading text="Loading dashboard data..." />
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={<FaCar />} label="Total Rides" value={summary?.totalRides || 0} />
          <StatCard
            icon={<FaCalendarAlt />}
            label="Active Drivers"
            value={summary?.activeDrivers || 0}
          />
          <StatCard
            icon={<FaChartLine />}
            label="Growth Rate"
            value={summary?.growthRate || "0%"}
          />
        </section>
      )}
    </main>
  );
}

export default DashboardPage;
