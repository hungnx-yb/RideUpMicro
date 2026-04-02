import { Link } from "react-router-dom";

function CTASection() {
  return (
    <section className="bg-white px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
      <div className="reveal-on-scroll mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-900 px-6 py-12 text-center text-white shadow-xl shadow-slate-900/25 sm:px-10 sm:py-14">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Sẵn sàng đi chuyến đầu tiên?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-emerald-100 sm:text-base">
          Mở app, chọn điểm đón, đặt chuyến trong vài giây. Trải nghiệm quen thuộc, nhanh và rõ như các ứng dụng gọi xe hàng đầu.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/trips/search"
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-400"
          >
            Tìm chuyến ngay
          </Link>
          <Link
            to="/auth/register"
            className="rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-white/20"
          >
            Đăng ký làm tài xế
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
