import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCarSide, FaPlusCircle } from "react-icons/fa";
import DashboardStats from "../components/DashboardStats";
import DriverNavbar from "../components/DriverNavbar";
import MonthlyStats from "../components/MonthlyStats";
import QuickActions from "../components/QuickActions";
import RatingCard from "../components/RatingCard";
import RecentActivities from "../components/RecentActivities";
import UpcomingTrips from "../components/UpcomingTrips";
import DriverCreateTripModal from "../components/DriverCreateTripModal";
import useAuth from "../hooks/useAuth";

function DriverDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statistics] = useState({
    totalTrips: { value: "1", description: "1 đang đi" },
    bookedCustomers: { value: "6", description: "Đã thanh toán" },
    totalRevenue: { value: "1.200.000 đ", description: "Hôm nay" },
    averageRating: { value: "4.8", description: "Từ khách hàng" },
  });

  const [trips] = useState([
    {
      id: 1,
      from: "Hà Nội",
      to: "Ninh Bình",
      time: "08:30",
      date: "13/03/2026",
      distance: "95 km",
      seatsBooked: 6,
      seatsTotal: 6,
      revenue: "1.200.000 đ",
      status: "Đang đi",
    },
  ]);

  const [activities] = useState([
    {
      id: 1,
      route: "Hà Nội → Nam Định",
      customers: 6,
      revenue: "1.080.000 đ",
      date: "12/03/2026",
    },
    {
      id: 2,
      route: "Hà Nội → Hưng Yên",
      customers: 6,
      revenue: "720.000 đ",
      date: "11/03/2026",
    },
    {
      id: 3,
      route: "Hà Nội → Hải Dương",
      customers: 6,
      revenue: "900.000 đ",
      date: "10/03/2026",
    },
  ]);

  const [monthlyStats] = useState({
    completedTrips: 8,
    totalCustomers: 69,
    estimatedRevenue: "10.000.000 đ",
  });

  const displayName = user?.fullName?.trim() || user?.email || "Tài xế";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_100%_-20%,#dcfce7_0%,#f8fafc_38%,#f1f5f9_100%)]">
      <DriverNavbar driverName={displayName} tripsToday="1x" />

      <main className="mx-auto w-full max-w-[1400px] px-3 pb-8 pt-0 sm:px-4 lg:px-6">
        <section className="relative mb-6 flex min-h-[150px] flex-col justify-between gap-4 overflow-hidden rounded-b-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-900 px-5 py-5 text-white md:flex-row md:items-center md:px-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-10 top-0 h-52 w-52 rounded-full border border-white/40" />
            <div className="absolute right-20 top-6 h-44 w-44 rounded-full border border-white/30" />
          </div>

          <div className="relative z-10 flex items-start gap-4">
            <span className="mt-1 hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm sm:flex">
              <FaCarSide size={28} />
            </span>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Chào tài xế, {displayName}</h1>
              <p className="mt-2 text-base font-semibold text-emerald-100 md:text-lg">
              Online thông minh, tối ưu chuyến đi và doanh thu theo thời gian thực.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="relative z-10 inline-flex items-center gap-2 rounded-3xl bg-emerald-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-400"
          >
            <FaPlusCircle />
            Tạo chuyến mới
          </button>
        </section>

        <div className="mb-4">
          <DashboardStats statistics={statistics} />
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-5">
            <UpcomingTrips trips={trips} />
            <RecentActivities activities={activities} />
          </div>

          <div className="space-y-5">
            <QuickActions
              onCreateTrip={() => setShowCreateModal(true)}
              onManageTrips={() => navigate("/driver-dashboard")}
              onRevenue={() => navigate("/driver-dashboard")}
            />
            <MonthlyStats monthlyStats={monthlyStats} />
            <RatingCard
              rating={statistics.averageRating.value}
              message="Tuyệt vời! Tiếp tục duy trì chất lượng dịch vụ"
            />
          </div>
        </section>
      </main>

      <DriverCreateTripModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => setShowCreateModal(false)}
      />
    </div>
  );
}

export default DriverDashboardPage;
