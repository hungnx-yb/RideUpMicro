import { Link } from "react-router-dom";
import { FaCarSide } from "react-icons/fa";

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-orange-100/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-sm text-white shadow-md shadow-orange-500/30 transition-transform duration-300 group-hover:scale-105">
            <FaCarSide />
          </span>
          <span>RideUp</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/auth/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-100 hover:text-slate-900"
          >
            Đăng nhập
          </Link>
          <Link
            to="/auth/register"
            className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
