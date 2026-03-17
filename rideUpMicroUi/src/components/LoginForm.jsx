import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt } from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/authApi";

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email không được để trống";
    }

    if (password.length < 6) {
      nextErrors.password = "Mật khẩu tối thiểu 6 ký tự";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email, password });

      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "Đăng nhập thất bại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white/95 p-7 shadow-2xl shadow-slate-300/35 backdrop-blur sm:p-8">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
          <span className="relative block">
            <FaEnvelope className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Nhập email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          </span>
          {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Mật khẩu</span>
          <span className="relative block">
            <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
            </button>
          </span>
          {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
        </label>

        {submitError ? (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {submitError}
          </p>
        ) : null}

        <p className="pt-1 text-right text-sm text-slate-500">
          Cần đổi mật khẩu? Đăng nhập trước rồi vào mục đổi mật khẩu.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
        >
          <FaSignInAlt className="text-xs" />
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link to="/auth/register" className="font-semibold text-orange-600 hover:text-orange-700">
          Đăng ký ngay
        </Link>
      </p>
    </section>
  );
}

export default LoginForm;
