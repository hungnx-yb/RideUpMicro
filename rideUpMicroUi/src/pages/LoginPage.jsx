import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaTaxi } from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/authApi";

function LoginPage() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};
    if (!email.trim()) {
      nextErrors.email = "Vui lòng nhập email quản trị";
    }
    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    }
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setErrorMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login({ email: email.trim(), password });

      // Kiểm tra quyền ADMIN
      const roles = Array.isArray(res?.user?.roles) ? res.user.roles : [];
      if (!roles.includes("ADMIN")) {
        await logout();
        setErrorMessage("Tài khoản của bạn không có quyền truy cập cổng Quản trị viên (ADMIN).");
        return;
      }

      navigate("/admin/drivers", { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 selection:bg-orange-500 selection:text-white">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-orange-600/15 blur-[120px]" />
        <div className="absolute bottom-[-100px] right-[-100px] h-[400px] w-[400px] rounded-full bg-red-600/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header / Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 shadow-xl shadow-orange-500/20">
            <FaTaxi className="text-3xl text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Ride<span className="text-orange-500">Up</span> Portal
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <FaShieldAlt className="text-[11px]" />
            <span>Hệ thống Quản trị & Điều hành</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Đăng nhập Quản trị viên</h2>
            <p className="mt-1 text-xs text-slate-400">
              Vui lòng dùng tài khoản được cấp quyền Admin để truy cập
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-medium text-red-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email Quản trị
              </label>
              <div className="relative">
                <FaEnvelope className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@rideup.vn"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Mật khẩu
              </label>
              <div className="relative">
                <FaLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? "Đang xác thực..." : "Đăng nhập hệ thống"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} RideUp Microservices • Trung tâm quản trị
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
