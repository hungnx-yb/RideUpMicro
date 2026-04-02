import {
  FaBell,
  FaChartBar,
  FaCarSide,
  FaChevronDown,
  FaExchangeAlt,
  FaKey,
  FaLocationArrow,
  FaMapMarkerAlt,
  FaSignOutAlt,
  FaTaxi,
  FaUser,
  FaUserShield,
  FaUsers,
  FaThLarge,
  FaTripadvisor,
} from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const menuItems = [
  { label: "Bảng điều khiển", icon: FaThLarge, active: true },
  { label: "Chuyến xe", icon: FaTripadvisor },
  { label: "Khách hàng", icon: FaUsers },
  { label: "Theo dõi", icon: FaLocationArrow },
  { label: "Doanh thu", icon: FaChartBar },
];

function DriverNavbar({ driverName = "Nguyễn Văn Hùng", tripsToday = "1x" }) {
  const { logout, roles, activeRole, switchRole, user } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const displayName = user?.fullName?.trim() || user?.email || driverName;
  const displayInitial = displayName.charAt(0).toUpperCase();
  const canSwitchRole = roles.length >= 2;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSwitchRole = (role) => {
    switchRole(role);
    setIsMenuOpen(false);

    if (role === "DRIVER") {
      navigate("/driver-dashboard", { replace: true });
      return;
    }

    if (role === "ADMIN") {
      navigate("/admin-dashboard", { replace: true });
      return;
    }

    navigate("/trips/search", { replace: true });
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/auth/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 text-white backdrop-blur">
      <div className="flex w-full items-center justify-between px-4 py-3 lg:px-6 xl:px-8">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
              <FaCarSide size={14} />
            </span>
            <span className="text-xl font-extrabold text-white">
              Ride<span className="text-emerald-400">Up</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex xl:gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={`text-sm font-semibold transition-colors ${
                    item.active
                      ? "rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-emerald-300"
                      : "px-3 py-2 text-slate-300 hover:text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon size={14} />
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="relative hidden text-slate-300 sm:block">
            <FaBell size={20} />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((previous) => !previous)}
              className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                {displayInitial}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-sm font-bold text-white">{displayName}</span>
                <span className="block text-xs text-emerald-300">Tài xế {tripsToday}</span>
              </span>
              <FaChevronDown className="text-slate-400" size={12} />
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Chức năng
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/dashboard");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FaUser size={13} />
                  Trang cá nhân
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/auth/change-password");
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FaKey size={13} />
                  Đổi mật khẩu
                </button>

                {canSwitchRole ? (
                  <>
                    <div className="my-2 border-t border-slate-100" />

                    <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Chuyển vai trò
                    </p>

                    {roles.includes("CUSTOMER") ? (
                      <button
                        type="button"
                        onClick={() => handleSwitchRole("CUSTOMER")}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          activeRole === "CUSTOMER"
                            ? "bg-orange-50 text-orange-600"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <FaMapMarkerAlt size={13} />
                          Khách hàng
                        </span>
                        {activeRole === "CUSTOMER" ? <FaExchangeAlt size={12} /> : null}
                      </button>
                    ) : null}

                    {roles.includes("DRIVER") ? (
                      <button
                        type="button"
                        onClick={() => handleSwitchRole("DRIVER")}
                        className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          activeRole === "DRIVER"
                            ? "bg-orange-50 text-orange-600"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <FaTaxi size={13} />
                          Tài xế
                        </span>
                        {activeRole === "DRIVER" ? <FaExchangeAlt size={12} /> : null}
                      </button>
                    ) : null}

                    {roles.includes("ADMIN") ? (
                      <button
                        type="button"
                        onClick={() => handleSwitchRole("ADMIN")}
                        className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          activeRole === "ADMIN"
                            ? "bg-orange-50 text-orange-600"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <FaUserShield size={13} />
                          Admin
                        </span>
                        {activeRole === "ADMIN" ? <FaExchangeAlt size={12} /> : null}
                      </button>
                    ) : null}
                  </>
                ) : null}

                <div className="my-2 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
                >
                  <FaSignOutAlt size={14} />
                  {isLoggingOut ? "Đang thoát..." : "Đăng xuất"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export default DriverNavbar;
