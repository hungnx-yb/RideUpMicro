import { useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaCheckCircle, FaKey, FaLock, FaPaperPlane, FaShieldAlt, FaSpinner } from "react-icons/fa";
import CustomerNavbar from "../components/CustomerNavbar";
import FloatingSupportMenu from "../components/FloatingSupportMenu";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_100%_-20%,#dcfce7_0%,#f8fafc_38%,#f1f5f9_100%)]">
      <CustomerNavbar />

      <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-900 p-5 text-white shadow-xl shadow-slate-900/20 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                <FaShieldAlt className="text-[11px]" />
                Bao mat tai khoan
              </p>
              <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Doi mat khau</h1>
              <p className="mt-1 text-sm text-emerald-50/90">
                Xac thuc OTP truoc khi cap nhat mat khau moi de dam bao an toan.
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <FaArrowLeft className="text-xs" />
              Quay lai trang ca nhan
            </Link>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Mat khau hien tai</span>
                <span className="relative block">
                  <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    placeholder="Nhap mat khau hien tai"
                  />
                </span>
              </label>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isRequestingOtp}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRequestingOtp ? <FaSpinner className="text-xs animate-spin" /> : <FaPaperPlane className="text-xs" />}
                {isRequestingOtp ? "Dang gui OTP..." : "Gui OTP"}
              </button>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">OTP</span>
              <span className="relative block">
                <FaKey className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600" />
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="Nhap ma OTP"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Mat khau moi</span>
              <span className="relative block">
                <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-emerald-600" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={6}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  placeholder="Nhap mat khau moi (toi thieu 6 ky tu)"
                />
              </span>
            </label>

            {errorMessage ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {errorMessage}
              </p>
            ) : null}

            {message ? (
              <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <FaCheckCircle className="text-xs" />
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <FaSpinner className="text-xs animate-spin" /> : null}
              {isSubmitting ? "Dang cap nhat..." : "Xac nhan doi mat khau"}
            </button>
          </form>
        </section>
      </main>

      <FloatingSupportMenu />
    </div>
  );
}

export default ChangePasswordPage;
