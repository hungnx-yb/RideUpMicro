import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBroadcastTower,
  FaCar,
  FaChartLine,
  FaClipboardList,
  FaClock,
  FaHome,
  FaIdCard,
  FaPercentage,
  FaRoute,
  FaSignOutAlt,
  FaTaxi,
  FaTimes,
  FaUserShield,
} from "react-icons/fa";
import useAuth from "../../hooks/useAuth";

export const ADMIN_MENU_GROUPS = [
  {
    title: "Tổng quan",
    items: [
      { label: "Bảng điều khiển", path: "/admin-dashboard", icon: FaHome, end: true },
      { label: "Duyệt tài xế", path: "/admin-dashboard/drivers-approval", icon: FaIdCard },
      { label: "Duyệt phương tiện", path: "/admin-dashboard/vehicles-approval", icon: FaCar },
    ],
  },
  {
    title: "Thống kê & Báo cáo",
    items: [{ label: "Doanh thu & Công nợ", path: "/admin/revenue-analytics", icon: FaChartLine }],
  },
  {
    title: "Cấu hình hệ thống",
    items: [
      { label: "Hoa hồng & Uy tín", path: "/admin/commission-config", icon: FaPercentage },
      { label: "Thời gian Timeout (SLA)", path: "/admin/timeout-config", icon: FaClock },
      { label: "Khung giá cước", path: "/admin/fare-boundary", icon: FaRoute },
    ],
  },
  {
    title: "Vận hành & Hỗ trợ",
    items: [
      { label: "Phát sóng thông báo", path: "/admin/broadcast-push", icon: FaBroadcastTower },
    ],
  },
];

function SidebarNavList({ onNavigate }) {
  return (
    <nav className="space-y-6">
      {ADMIN_MENU_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {group.title}
          </p>
          <div className="mt-2 space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`shrink-0 text-sm ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/**
 * Khung giao diện chuẩn mực cho toàn bộ Admin Portal:
 * Sidebar dọc toàn phần (Full-height Sidebar) từ đầu trang đến cuối trang,
 * KHÔNG còn thanh header bar nằm ngang gây phân mảnh giao diện.
 */
function AdminLayout({ title, subtitle, icon: TitleIcon, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const adminName = user?.fullName?.trim() || user?.email || "Quản trị viên";
  const adminInitial = adminName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed,_#f8fafc_45%,_#f1f5f9_100%)] text-slate-800">
      {/* Mobile Top Bar (chỉ hiện trên màn hình nhỏ < lg) */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-orange-500 to-red-600 text-white shadow-sm">
            <FaTaxi className="text-sm" />
          </span>
          <span className="font-extrabold text-slate-900">
            Ride<span className="text-orange-500">Up</span>
            <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
              Admin
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Mở menu điều hướng"
        >
          <FaBars />
        </button>
      </div>

      {/* Sidebar Desktop (Full height, sticky top-0) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-md lg:flex">
        {/* Logo & Brand Header */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20">
            <FaTaxi className="text-lg" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                Ride<span className="text-orange-500">Up</span>
              </span>
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-extrabold text-orange-700">
                ADMIN
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">Hệ thống điều hành</p>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-3.5 py-4">
          <SidebarNavList />
        </div>

        {/* User Card & Logout Button */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-orange-500 to-red-500 text-xs font-bold text-white shadow-sm">
                {adminInitial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800">{adminName}</p>
                <p className="truncate text-[10px] font-medium text-slate-400">{user?.email || "admin@rideup.vn"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Đăng xuất khỏi hệ thống"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:opacity-50"
            >
              <FaSignOutAlt className="text-xs" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-orange-500 to-red-600 text-white shadow-sm">
                  <FaTaxi className="text-sm" />
                </span>
                <span className="font-extrabold text-slate-900">
                  Ride<span className="text-orange-500">Up</span> Admin
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4">
              <SidebarNavList onNavigate={() => setIsSidebarOpen(false)} />
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-orange-500 to-red-500 text-xs font-bold text-white shadow-sm">
                    {adminInitial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">{adminName}</p>
                    <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                {title && (
                  <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    {TitleIcon && (
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-lg text-white shadow-md shadow-orange-500/20">
                        <TitleIcon />
                      </span>
                    )}
                    <span>{title}</span>
                  </h1>
                )}
                {subtitle && <p className="mt-1.5 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
