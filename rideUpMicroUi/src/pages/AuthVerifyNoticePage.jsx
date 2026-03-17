import { Link, useSearchParams } from "react-router-dom";
import { FaEnvelopeOpenText } from "react-icons/fa";

function AuthVerifyNoticePage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "email của bạn";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_55%)] px-4 py-10">
      <main className="mx-auto w-full max-w-2xl rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <FaEnvelopeOpenText size={24} />
        </span>

        <h1 className="mt-5 text-3xl font-extrabold text-slate-900">Xác thực email để hoàn tất đăng ký</h1>
        <p className="mt-3 text-slate-600">
          RideUp đã gửi email xác thực đến <span className="font-semibold text-slate-900">{email}</span>.
          Vui lòng mở email và nhấn vào liên kết để kích hoạt tài khoản.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/auth/login"
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25"
          >
            Đi đến đăng nhập
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Về trang chủ
          </Link>
        </div>
      </main>
    </div>
  );
}

export default AuthVerifyNoticePage;
