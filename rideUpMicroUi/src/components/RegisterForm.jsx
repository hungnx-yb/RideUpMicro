import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import RoleCard from "./RoleCard";
import useAuth from "../hooks/useAuth";
import { getApiErrorMessage } from "../services/authApi";

function RegisterForm() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CUSTOMER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const payload = {
      fullName,
      email,
      password,
      role,
    };

    try {
      setIsSubmitting(true);
      await register(payload);
      navigate(`/auth/verify-notice?email=${encodeURIComponent(email)}`, {
        replace: true,
      });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "Đăng ký thất bại"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white/95 p-7 shadow-2xl shadow-slate-300/35 backdrop-blur sm:p-8">
      <h3 className="text-xl font-bold text-slate-900">Thong tin ca nhan</h3>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Họ và tên</span>
          <span className="relative block">
            <FaUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
              required
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
          <span className="relative block">
            <FaEnvelope className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
              required
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Mật khẩu</span>
          <span className="relative block">
            <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ít nhất 6 ký tự"
              minLength={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
              required
            />
          </span>
        </label>

        <div className="pt-1">
          <p className="mb-2 text-sm font-medium text-slate-700">Bạn muốn tham gia với vai trò?</p>
          <div className="space-y-3">
            <RoleCard role="CUSTOMER" selectedRole={role} onSelect={setRole} />
            <RoleCard role="DRIVER" selectedRole={role} onSelect={setRole} />
          </div>
        </div>

        {submitError ? (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
        >
          {isSubmitting ? "Đang tạo tài khoản..." : "Tiếp theo"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link to="/auth/login" className="font-semibold text-orange-600 hover:text-orange-700">
          Đăng nhập
        </Link>
      </p>
    </section>
  );
}

export default RegisterForm;
