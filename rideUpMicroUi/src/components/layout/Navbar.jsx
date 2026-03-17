import { Link, NavLink } from "react-router-dom";
import { FaCarSide, FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import Button from "../common/Button";
import useAuth from "../../hooks/useAuth";

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <FaCarSide className="text-brand-500" />
          <span>RideUp</span>
        </Link>

        <div className="flex items-center gap-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-sm font-medium ${isActive ? "text-brand-600" : "text-slate-600"}`
            }
          >
            Home
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `text-sm font-medium ${isActive ? "text-brand-600" : "text-slate-600"}`
                }
              >
                Dashboard
              </NavLink>
              <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
                <FaUserCircle />
                <span>{user?.name || "User"}</span>
              </div>
              <Button variant="secondary" className="gap-2" onClick={logout}>
                <FaSignOutAlt />
                Logout
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth/login" className="text-sm font-medium text-slate-600">
                Login
              </Link>
              <Link to="/auth/register">
                <Button>Register</Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
