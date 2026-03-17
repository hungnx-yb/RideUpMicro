import { useState } from "react";
import { Link } from "react-router-dom";
import { FaKey, FaLock, FaPaperPlane } from "react-icons/fa";
import {
  changePasswordApi,
  getApiErrorMessage,
  requestOtpApi,
} from "../services/authApi";

function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleRequestOtp = async () => {
    if (!password.trim()) {
      setErrorMessage("Vui lòng nhập mật khẩu hiện tại để nhận OTP.");
      return;
    }

    setMessage("");
    setErrorMessage("");

    try {
      setIsRequestingOtp(true);
      await requestOtpApi(password);
      setMessage("OTP đã được gửi về email của bạn.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không thể gửi OTP"));
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!otp.trim() || newPassword.length < 6) {
      setErrorMessage("Vui lòng nhập OTP và mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }

    try {
      setIsSubmitting(true);
      await changePasswordApi({ otp, newPassword });
      setMessage("Đổi mật khẩu thành công.");
      setOtp("");
      setNewPassword("");
      setPassword("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Đổi mật khẩu thất bại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_55%)] px-4 py-10">
      <main className="mx-auto w-full max-w-xl rounded-3xl border border-orange-100 bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-extrabold text-slate-900">Đổi mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-500">
          Nhập mật khẩu hiện tại để nhận OTP qua email, sau đó đặt mật khẩu mới.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Mật khẩu hiện tại</span>
            <span className="relative block">
              <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
                placeholder="Nhập mật khẩu hiện tại"
              />
            </span>
          </label>

          <button
            type="button"
            onClick={handleRequestOtp}
            disabled={isRequestingOtp}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-100"
          >
            <FaPaperPlane className="text-xs" />
            {isRequestingOtp ? "Đang gửi OTP..." : "Gửi OTP"}
          </button>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">OTP</span>
            <span className="relative block">
              <FaKey className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
                placeholder="Nhập OTP"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Mật khẩu mới</span>
            <span className="relative block">
              <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
                placeholder="Nhập mật khẩu mới"
              />
            </span>
          </label>

          {errorMessage ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {errorMessage}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            {isSubmitting ? "Đang cập nhật..." : "Xác nhận đổi mật khẩu"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/dashboard" className="text-sm font-medium text-orange-600 hover:text-orange-700">
            Quay lại dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

export default ChangePasswordPage;
