import { Link } from "react-router-dom";
import { FaCarSide, FaEnvelope, FaFacebookF, FaInstagram, FaPhoneAlt } from "react-icons/fa";

function Footer() {
  return (
    <footer className="bg-[#0b0b0b] text-slate-300">
      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-b border-white/10 pb-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3 font-semibold text-white">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm text-white shadow-lg shadow-emerald-500/20">
                <FaCarSide />
              </span>
              <span className="text-2xl font-extrabold">RideUp</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Nền tảng di chuyển thông minh giúp khách hàng đặt chuyến nhanh và tài xế vận hành hiệu quả mỗi ngày.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <a
                href="#"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition-colors hover:border-emerald-400 hover:text-emerald-300"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
              <a
                href="#"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition-colors hover:border-emerald-400 hover:text-emerald-300"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Dành cho khách hàng</h3>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/trips/search" className="text-slate-400 transition-colors hover:text-white">Đặt chuyến ngay</Link>
              <Link to="/auth/login" className="text-slate-400 transition-colors hover:text-white">Theo dõi lịch sử chuyến</Link>
              <Link to="/auth/login" className="text-slate-400 transition-colors hover:text-white">Quản lý tài khoản</Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Dành cho tài xế</h3>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/auth/register" className="text-slate-400 transition-colors hover:text-white">Đăng ký lái xe</Link>
              <Link to="/auth/login" className="text-slate-400 transition-colors hover:text-white">Truy cập dashboard</Link>
              <Link to="/auth/login" className="text-slate-400 transition-colors hover:text-white">Quản lý chuyến đi</Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Liên hệ và hỗ trợ</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p className="inline-flex items-center gap-2"><FaPhoneAlt className="text-emerald-400" /> 0399897208</p>
              <p className="inline-flex items-center gap-2"><FaEnvelope className="text-emerald-400" /> support@rideup.vn</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/trips/search"
                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-200"
              >
                Tôi là khách hàng
              </Link>
              <Link
                to="/auth/register"
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10"
              >
                Tôi muốn lái xe
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start justify-between gap-3 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} RideUp. Tất cả quyền được bảo lưu.</p>
          <div className="flex flex-wrap gap-3">
            <a href="#" className="transition-colors hover:text-slate-300">Điều khoản sử dụng</a>
            <a href="#" className="transition-colors hover:text-slate-300">Chính sách bảo mật</a>
            <a href="#" className="transition-colors hover:text-slate-300">Hỗ trợ pháp lý</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
