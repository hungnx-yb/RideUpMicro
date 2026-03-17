import { Link } from "react-router-dom";

function CTASection() {
  return (
    <section className="bg-white px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
      <div className="reveal-on-scroll mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#ef4444] px-6 py-12 text-center text-white shadow-xl shadow-orange-500/30 sm:px-10 sm:py-14">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Sẵn sàng bắt đầu hành trình?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-orange-100 sm:text-base">
          Đăng ký ngay hôm nay và tận hưởng những chuyến đi tiết kiệm, an toàn cùng hàng nghìn
          khách hàng khác.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth/register"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-red-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-50"
          >
            Đăng ký làm khách hàng
          </Link>
          <Link
            to="/auth/register"
            className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-white/20"
          >
            Đăng ký làm tài xế
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
