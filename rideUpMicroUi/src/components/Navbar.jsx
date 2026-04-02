import { Link } from "react-router-dom";
import { FaCarSide } from "react-icons/fa";

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-3 text-xl font-extrabold tracking-tight text-slate-900"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
            <FaCarSide />
          </span>
          <span className="text-[2rem] leading-none sm:text-[2.1rem]">RideUp</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
          <a
            href="#"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
          >
            Khách hàng
          </a>
          <a
            href="#"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
          >
            Tài xế
          </a>
          <a
            href="#"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
          >
            Doanh nghiệp
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/auth/login"
            className="rounded-full px-4 py-2 text-sm font-bold text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
          >
            Đăng nhập
          </Link>
          <Link
            to="/auth/register"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
