import { Link } from "react-router-dom";

const heroImage =
  "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80";

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.1),transparent_45%)]" />
      <div className="pointer-events-none absolute -left-24 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-slate-950/40 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:items-center md:gap-10 md:py-16 lg:px-8 lg:py-20">
        <div className="reveal-on-scroll">
          <span className="inline-flex items-center rounded-full border border-emerald-200/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
            Di chuyển công nghệ kiểu super-app
          </span>
          <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Đặt xe nhanh, biết giá rõ, đón đúng điểm
          </h1>
          <p className="mt-4 max-w-lg text-sm text-emerald-50/90 sm:text-base">
            RideUp mang trải nghiệm gần với Grab: thao tác ngắn, thông tin hành trình rõ ràng,
            trạng thái thanh toán minh bạch và hỗ trợ theo thời gian thực.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              Giá minh bạch
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              Đặt chuyến nhanh
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              Dashboard tài xế trực quan
            </span>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/trips/search"
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              Đặt chuyến ngay
            </Link>
            <Link
              to="/auth/login"
              className="rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-white/20"
            >
              Vào tài khoản
            </Link>
          </div>
        </div>

        <div
          className="reveal-on-scroll mx-auto w-full max-w-md md:max-w-none"
          style={{ "--reveal-delay": "120ms" }}
        >
          <div className="animate-glow overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/35 backdrop-blur-sm transition-transform duration-500 hover:scale-[1.02]">
            <img
              src={heroImage}
              alt="Tài xế RideUp"
              className="h-72 w-full rounded-xl object-cover sm:h-80 motion-safe:animate-float lg:h-[26rem]"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/20 bg-white/10 px-2 py-2">
              <p className="text-lg font-bold text-white">4.8</p>
              <p className="text-[11px] text-emerald-100">Đánh giá</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-2 py-2">
              <p className="text-lg font-bold text-white">24/7</p>
              <p className="text-[11px] text-emerald-100">Hỗ trợ</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-2 py-2">
              <p className="text-lg font-bold text-white">100%</p>
              <p className="text-[11px] text-emerald-100">Theo dõi chuyến</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
