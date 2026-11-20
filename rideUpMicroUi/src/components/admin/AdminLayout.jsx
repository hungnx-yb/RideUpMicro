import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaBroadcastTower,
  FaCar,
  FaChartLine,
  FaChevronDown,
  FaClipboardList,
  FaClock,
  FaHome,
  FaIdCard,
  FaPercentage,
  FaRoute,
  FaSignOutAlt,
  FaTaxi,
  FaTimes,
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
      { label: "Nhật ký kiểm toán", path: "/admin/audit-logs", icon: FaClipboardList },
    ],
  },
];

function SidebarContent({ onNavigate }) {
  return (
    <nav className="space-y-6">
      {ADMIN_MENU_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group.title}</p>
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
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="shrink-0 text-sm" />
                  <span className="truncate">{item.label}</span>
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
 * Khung giao diện chung cho các trang quản trị: header + sidebar điều hướng theo nhóm chức năng.
 */
function AdminLayout({ title, subtitle, icon: TitleIcon, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);

  const adminName = user?.fullName?.trim() || user?.email || "Quản trị viên";
  const adminInitial = adminName.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
              aria-label="Mở menu"
            >
              <FaBars />
            </button>
            <button type="button" onClick={() => navigate("/admin-dashboard")} className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <FaTaxi />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-slate-800">
                Ride<span className="text-orange-500">Up</span>
                <span className="ml-2 hidden rounded-lg bg-slate-100 px-2 py-0.5 align-middle text-xs font-bold text-slate-500 sm:inline">
                  Admin
                </span>
              </span>
            </button>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm hover:border-orange-300"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-400 font-bold text-white">
                {adminInitial}
              </span>
              <span className="hidden text-left md:block">
                <span className="block max-w-[180px] truncate text-sm font-bold text-slate-800">{adminName}</span>
                <span className="block text-xs font-semibold text-orange-500">Quản trị viên</span>
              </span>
              <FaChevronDown className={`text-slate-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} size={12} />
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-50"
                >
                  <FaSignOutAlt size={14} />
                  {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex w-full">
        <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white/80 px-3 py-6 lg:block">
          <SidebarContent />
        </aside>

        {isSidebarOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setIsSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white px-3 py-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between px-3">
                <span className="text-lg font-extrabold text-slate-800">Menu quản trị</span>
                <button type="button" onClick={() => setIsSidebarOpen(false)} className="text-slate-500" aria-label="Đóng menu">
                  <FaTimes />
                </button>
              </div>
              <SidebarContent onNavigate={() => setIsSidebarOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {TitleIcon ? (
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-lg text-white shadow-md">
                    <TitleIcon />
                  </span>
                ) : null}
                {title}
              </h1>
              {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
