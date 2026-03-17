import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { getApiErrorMessage, verifyAccountApi } from "../services/authApi";

function AuthVerifyAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Đang xác thực tài khoản...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Liên kết xác thực không hợp lệ.");
      return;
    }

    const verify = async () => {
      try {
        const response = await verifyAccountApi(token);
        setStatus("success");
        setMessage(response?.message || "Xác thực tài khoản thành công. Đang chuyển đến trang đăng nhập...");
      } catch (error) {
        setStatus("error");
        setMessage(getApiErrorMessage(error, "Xác thực thất bại hoặc liên kết đã hết hạn"));
      }
    };

    verify();

  }, [token]);

  useEffect(() => {
    if (status !== "success") {
      return;
    }

    const redirectTimeout = setTimeout(() => {
      navigate("/auth/login", { replace: true });
    }, 800);

    return () => {
      clearTimeout(redirectTimeout);
    };
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_55%)] px-4 py-10">
      <main className="mx-auto w-full max-w-xl rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            status === "success" ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
          }`}
        >
          {status === "success" ? <FaCheckCircle size={24} /> : <FaExclamationTriangle size={24} />}
        </span>

        <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
          {status === "success" ? "Xác thực thành công" : "Xác thực tài khoản"}
        </h1>
        <p className="mt-3 text-slate-600">{message}</p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/auth/login"
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25"
          >
            Đăng nhập ngay
          </Link>
          <Link
            to="/auth/register"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Đăng ký lại
          </Link>
        </div>
      </main>
    </div>
  );
}

export default AuthVerifyAccountPage;
