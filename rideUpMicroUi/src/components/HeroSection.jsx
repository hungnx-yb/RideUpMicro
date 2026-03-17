import { Link } from "react-router-dom";

const heroImage =
  "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80";

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#7a240e] via-[#c93818] to-[#ff5a1f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.2),transparent_45%)]" />
      <div className="pointer-events-none absolute -left-24 -top-20 h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-red-900/30 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:items-center md:gap-10 md:py-16 lg:px-8 lg:py-20">
        <div className="reveal-on-scroll">
          <span className="inline-flex items-center rounded-full border border-orange-200/40 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">
            Hệ thống xe công nghệ thông minh
          </span>
          <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Di chuyển thông minh, tiết kiệm hơn mỗi ngày
          </h1>
          <p className="mt-4 max-w-lg text-sm text-orange-50/90 sm:text-base">
            RideUp kết nối khách hàng với tài xế tiện lợi từng khoảnh khắc. Ghép chuyến linh
            hoạt, giá cố định, an toàn và tiết kiệm.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/auth/register"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-red-600 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-50"
            >
              Đăng ký ngay
            </Link>
            <Link
              to="/auth/login"
              className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-white/20"
            >
              Đăng nhập
            </Link>
          </div>
        </div>

        <div
          className="reveal-on-scroll mx-auto w-full max-w-md md:max-w-none"
          style={{ "--reveal-delay": "120ms" }}
        >
          <div className="animate-glow overflow-hidden rounded-2xl border border-white/30 bg-white/10 p-2 shadow-2xl shadow-black/35 backdrop-blur-sm transition-transform duration-500 hover:scale-[1.02]">
            <img
              src={heroImage}
              alt="Tài xế RideUp"
              className="h-72 w-full rounded-xl object-cover sm:h-80 motion-safe:animate-float lg:h-[26rem]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
