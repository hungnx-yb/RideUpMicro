import { Link } from "react-router-dom";
import { FaCarSide } from "react-icons/fa";
import RegisterForm from "../components/RegisterForm";
import FloatingSupportMenu from "../components/FloatingSupportMenu";

function RegisterPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dcfce7_0%,#f8fafc_55%)]">
      <header className="border-b border-emerald-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
              <FaCarSide />
            </span>
            <span>RideUp</span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/auth/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Đăng nhập
            </Link>
            <Link
              to="/auth/register"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-slate-900/25"
            >
              Đăng ký
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm text-white">
              <FaCarSide />
            </span>
            <span>RideUp</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Tạo tài khoản</h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Tham gia cộng đồng RideUp ngay hôm nay
          </p>
        </div>

        <RegisterForm />
      </main>

      <FloatingSupportMenu />
    </div>
  );
}

export default RegisterPage;
