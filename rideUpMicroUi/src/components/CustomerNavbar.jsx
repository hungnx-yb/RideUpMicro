import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCarSide,
  FaChevronDown,
  FaExchangeAlt,
  FaKey,
  FaSearch,
  FaSignOutAlt,
  FaSuitcase,
  FaTaxi,
  FaUser,
  FaUserShield,
  FaWallet,
} from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import { useNotificationSocket } from "../context/NotificationSocketContext";

function CustomerNavbar() {
  const { user, logout, roles, activeRole, switchRole } = useAuth();
  const { unreadCount } = useNotificationSocket() || {};
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = user?.fullName?.trim() || user?.email || "RideUp User";
  const displayInitial = displayName.charAt(0).toUpperCase();
  const canSwitchRole = roles.length >= 2;
  const safeUnreadCount = Number.isFinite(unreadCount) ? unreadCount : 0;
  const unreadBadge = safeUnreadCount > 5 ? "5+" : `${safeUnreadCount}`;
  const menuItems = [
    { to: "/trips/search", label: "Tìm chuyến xe", icon: FaSearch },
    { to: "/trips/my", label: "Chuyến của tôi", icon: FaSuitcase },
    { to: "/payments", label: "Thanh toán", icon: FaWallet },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSwitchRole = (role) => {
    switchRole(role);
    setIsOpen(false);

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
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/95 backdrop-blur-md">
      <nav className="flex w-full items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8 xl:px-10">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-slate-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-xs text-white">
            <FaCarSide className="text-[11px]" />
          </span>
          <span>RideUp</span>
        </Link>

        <ul className="hidden flex-1 items-center justify-center gap-3 md:flex lg:gap-5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-orange-50 text-orange-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="text-xs" />
                  <span className="relative">
                    {item.label}
                    {item.badge > 0 ? (
                      <span className="absolute -right-6 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {unreadBadge}
                      </span>
                    ) : null}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="relative ml-auto flex shrink-0 items-center gap-3" ref={menuRef}>
          <Link
            to="/notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
            aria-label="Thông báo"
          >
            <FaBell className="text-sm" />
            {safeUnreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadBadge}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen((previous) => !previous)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-orange-200 hover:bg-orange-50"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
              {displayInitial}
            </span>
            <span className="hidden font-medium sm:inline">{displayName}</span>
            <FaChevronDown className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {isOpen ? (
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <p className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Chức năng
              </p>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/profile");
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700"
              >
                <FaUser className="text-xs" />
                Trang cá nhân
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/auth/change-password");
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700"
              >
                <FaKey className="text-xs" />
                Đổi mật khẩu
              </button>

              {!roles.includes("DRIVER") ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/driver/onboarding");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                >
                  <FaTaxi className="text-xs" />
                  Đăng ký tài xế
                </button>
              ) : null}

              {canSwitchRole ? (
                <>
                  <div className="my-1 border-t border-slate-100" />

                  <p className="px-4 pb-2 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Chuyển vai trò
                  </p>

                  {roles.includes("CUSTOMER") ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchRole("CUSTOMER")}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                        activeRole === "CUSTOMER"
                          ? "bg-orange-50 text-orange-700"
                          : "text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                      }`}
                    >
                      <span>Khách hàng</span>
                      {activeRole === "CUSTOMER" ? <FaExchangeAlt className="text-xs" /> : null}
                    </button>
                  ) : null}

                  {roles.includes("DRIVER") ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchRole("DRIVER")}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                        activeRole === "DRIVER"
                          ? "bg-orange-50 text-orange-700"
                          : "text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <FaTaxi className="text-xs" />
                        Tài xế
                      </span>
                      {activeRole === "DRIVER" ? <FaExchangeAlt className="text-xs" /> : null}
                    </button>
                  ) : null}

                  {roles.includes("ADMIN") ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchRole("ADMIN")}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                        activeRole === "ADMIN"
                          ? "bg-orange-50 text-orange-700"
                          : "text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <FaUserShield className="text-xs" />
                        Admin
                      </span>
                      {activeRole === "ADMIN" ? <FaExchangeAlt className="text-xs" /> : null}
                    </button>
                  ) : null}
                </>
              ) : null}

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <FaSignOutAlt className="text-xs" />
                {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </button>
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

export default CustomerNavbar;
