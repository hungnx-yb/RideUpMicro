import { useState } from "react";
import { FaCarSide, FaPlusCircle } from "react-icons/fa";
import DashboardStats from "../components/DashboardStats";
import DriverNavbar from "../components/DriverNavbar";
import MonthlyStats from "../components/MonthlyStats";
import QuickActions from "../components/QuickActions";
import RatingCard from "../components/RatingCard";
import RecentActivities from "../components/RecentActivities";
import UpcomingTrips from "../components/UpcomingTrips";
import useAuth from "../hooks/useAuth";

function DriverDashboardPage() {
  const { user } = useAuth();
  const [statistics] = useState({
    totalTrips: { value: "14", description: "5 sắp tới" },
    bookedCustomers: { value: "69", description: "69 đã thanh toán" },
    totalRevenue: { value: "10.000.000 đ", description: "Tháng này" },
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
    {
      id: 2,
      from: "Hà Nội",
      to: "Hưng Yên",
      time: "06:30",
      date: "13/03/2026",
      distance: "60 km",
      seatsBooked: 3,
      seatsTotal: 6,
      revenue: "360.000 đ",
      status: "Sắp tới",
    },
    {
      id: 3,
      from: "Hà Nội",
      to: "Bắc Ninh",
      time: "07:30",
      date: "14/03/2026",
      distance: "40 km",
      seatsBooked: 1,
      seatsTotal: 6,
      revenue: "100.000 đ",
      status: "Sắp tới",
    },
    {
      id: 4,
      from: "Hà Nội",
      to: "Hải Dương",
      time: "14:00",
      date: "13/03/2026",
      distance: "85 km",
      seatsBooked: 4,
      seatsTotal: 6,
      revenue: "600.000 đ",
      status: "Sắp tới",
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
    <div className="min-h-screen bg-[#f4f4f4]">
      <DriverNavbar driverName={displayName} tripsToday="1x" />

      <main className="w-full px-1 pb-8 pt-0 sm:px-2 md:px-3 lg:px-4">
        <section className="relative mb-7 flex min-h-[180px] flex-col justify-between gap-4 overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-orange-600 px-5 py-6 text-white md:flex-row md:items-center md:px-9">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-10 top-0 h-52 w-52 rounded-full border border-white/40" />
            <div className="absolute right-20 top-6 h-44 w-44 rounded-full border border-white/30" />
          </div>

          <div className="relative z-10 flex items-start gap-4">
            <span className="mt-1 hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm sm:flex">
              <FaCarSide size={28} />
            </span>

            <div>
              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Xin chào, {displayName}! 👋</h1>
              <p className="mt-2 text-lg font-semibold text-orange-50 md:text-xl">
              Chào mừng trở lại với RideUp Driver Dashboard
              </p>
            </div>
          </div>

          <button
            type="button"
            className="relative z-10 inline-flex items-center gap-2 rounded-3xl bg-white px-7 py-3.5 text-xl font-bold text-orange-600 shadow-lg transition-colors hover:bg-orange-50"
          >
            <FaPlusCircle />
            Tạo chuyến mới
          </button>
        </section>

        <div className="mb-6">
          <DashboardStats statistics={statistics} />
        </div>

        <section className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 md:col-span-2">
            <UpcomingTrips trips={trips} />
            <RecentActivities activities={activities} />
          </div>

          <div className="space-y-5">
            <QuickActions />
            <MonthlyStats monthlyStats={monthlyStats} />
            <RatingCard
              rating={statistics.averageRating.value}
              message="Tuyệt vời! Tiếp tục duy trì chất lượng dịch vụ"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default DriverDashboardPage;
