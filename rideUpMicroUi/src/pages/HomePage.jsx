import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaBolt, FaClock, FaMapMarkedAlt, FaShieldAlt, FaStar, FaUserTie, FaWallet } from "react-icons/fa";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import heroCar1 from "../assets/anh-nen-sieu-xe_020255797.jpg";
import heroCar2 from "../assets/hinh-nen-sieu-xe-1.jpg";
import heroCar3 from "../assets/hinh-nen-sieu-xe-dep-mat-cho-may-tinh-1200.jpg";
import heroCar4 from "../assets/hinh-nen-sieu-xe-lamborghini-1200.jpg";

function HomePage() {
  const heroSlides = [
    { src: heroCar1, alt: "Xe RideUp 1" },
    { src: heroCar2, alt: "Xe RideUp 2" },
    { src: heroCar3, alt: "Xe RideUp 3" },
    { src: heroCar4, alt: "Xe RideUp 4" },
  ];
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal-on-scroll");

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <Navbar />
      <main className="bg-[#f6f6f6]">
        <section className="bg-[#111111] text-white">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-16 lg:px-8">
            <div className="reveal-on-scroll">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">RideUp Platform</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                Di chuyển linh hoạt cho cuộc sống và công việc
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
                Một nền tảng duy nhất để khách hàng đặt chuyến nhanh, và tài xế tăng thu nhập ổn định.
                Nhanh hơn, rõ ràng hơn, đúng chất dịch vụ công nghệ hiện đại.
              </p>

              <div className="mt-8 grid max-w-xl gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:grid-cols-2">
                <Link
                  to="/trips/search"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Đặt chuyến ngay
                </Link>
                <Link
                  to="/auth/register"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  Đăng ký lái xe
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300 sm:text-sm">
                <span className="inline-flex items-center gap-2"><FaShieldAlt className="text-emerald-300" />Hành trình an toàn</span>
                <span className="inline-flex items-center gap-2"><FaClock className="text-emerald-300" />Đặt nhanh trong vài giây</span>
                <span className="inline-flex items-center gap-2"><FaWallet className="text-emerald-300" />Giá minh bạch trước khi đi</span>
              </div>
            </div>

            <div className="reveal-on-scroll lg:justify-self-end" style={{ "--reveal-delay": "120ms" }}>
              <div className="w-full max-w-[540px] space-y-3">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div
                    className="flex transition-transform duration-700 ease-out"
                    style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                  >
                    {heroSlides.map((slide) => (
                      <img
                        key={slide.alt}
                        src={slide.src}
                        alt={slide.alt}
                        className="h-56 min-w-full object-cover sm:h-64"
                      />
                    ))}
                  </div>

                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/45 px-3 py-1.5">
                    {heroSlides.map((slide, index) => (
                      <button
                        key={slide.alt}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        className={`h-2.5 rounded-full transition-all ${
                          activeSlide === index ? "w-6 bg-white" : "w-2.5 bg-white/45"
                        }`}
                        aria-label={`Xem ảnh ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={`thumb-${slide.alt}`}
                      type="button"
                      onClick={() => setActiveSlide(index)}
                      className={`overflow-hidden rounded-lg border ${
                        activeSlide === index ? "border-emerald-300" : "border-white/10"
                      }`}
                    >
                      <img src={slide.src} alt={slide.alt} className="h-14 w-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-bold text-white">4.8</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-300">Đánh giá dịch vụ</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">24/7</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-300">Hỗ trợ liên tục</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">100%</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-300">Theo dõi trạng thái</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="reveal-on-scroll grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                <FaStar className="text-emerald-600" /> Dành cho khách hàng
              </p>
              <h2 className="mt-4 text-3xl font-extrabold text-slate-900">Đi đâu cũng nhanh, giá luôn rõ</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Chọn điểm đón, biết trước chi phí, theo dõi trạng thái chuyến và thanh toán tiện lợi.
                Trải nghiệm thiết kế để bạn đi lại nhẹ đầu mỗi ngày.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Đặt chuyến trong vài thao tác</li>
                <li className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Nhìn rõ lộ trình và thời gian</li>
                <li className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Theo dõi lịch sử chuyến đi tiện lợi</li>
              </ul>
              <Link to="/trips/search" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-emerald-700">
                Bắt đầu đặt chuyến <FaArrowRight />
              </Link>
            </article>

            <article className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                <FaUserTie /> Dành cho tài xế
              </p>
              <h2 className="mt-4 text-3xl font-extrabold text-slate-900">Tăng thu nhập bằng dashboard thông minh</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Tạo chuyến, theo dõi ghế trống, quản lý doanh thu và hoạt động trong ngày bằng một giao diện
                rõ ràng, tối ưu cho vận hành thực tế.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Theo dõi chuyến đang chạy theo thời gian thực</li>
                <li className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Kiểm soát doanh thu hằng ngày</li>
                <li className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Đăng ký và vận hành nhanh chóng</li>
              </ul>
              <Link to="/auth/register" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-emerald-700">
                Đăng ký lái xe ngay <FaArrowRight />
              </Link>
            </article>
          </div>
        </section>

        <section className="bg-white py-10">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="reveal-on-scroll mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900">RideUp trong từng khoảnh khắc di chuyển</h2>
                <p className="mt-2 text-sm text-slate-500">Ảnh thực tế và mô tả rõ ràng giúp tăng niềm tin và tỷ lệ chuyển đổi đăng ký.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="reveal-on-scroll overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80"
                  alt="Khách hàng lên xe đúng điểm hẹn"
                  className="h-52 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-bold text-slate-900">Đón đúng điểm, đúng giờ</h3>
                  <p className="mt-1 text-sm text-slate-600">Hành trình nhất quán, rõ thời gian cho cả khách và tài xế.</p>
                </div>
              </article>

              <article className="reveal-on-scroll overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ "--reveal-delay": "80ms" }}>
                <img
                  src="https://images.unsplash.com/photo-1517404215738-15263e9f9178?auto=format&fit=crop&w=1200&q=80"
                  alt="Khách hàng đặt xe trên điện thoại"
                  className="h-52 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-bold text-slate-900">Đặt nhanh trên di động</h3>
                  <p className="mt-1 text-sm text-slate-600">Trải nghiệm đặt chuyến mượt, ít bước, giảm thời gian chờ.</p>
                </div>
              </article>

              <article className="reveal-on-scroll overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ "--reveal-delay": "140ms" }}>
                <img
                  src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80"
                  alt="Tài xế theo dõi vận hành"
                  className="h-52 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-bold text-slate-900">Vận hành tài xế rõ ràng</h3>
                  <p className="mt-1 text-sm text-slate-600">Nhìn ngay chuyến đang đi, ghế trống và doanh thu trong ngày.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] py-14 sm:py-16">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 translate-x-1/3 translate-y-1/3 rounded-full bg-slate-200/50 blur-2xl" />
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="reveal-on-scroll flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Điểm khác biệt RideUp</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
                  Không chỉ là đặt xe,
                  <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent"> mà là hệ sinh thái di chuyển</span>
                </h2>
              </div>
              <Link
                to="/trips/search"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-black"
              >
                Trải nghiệm ngay <FaArrowRight />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="reveal-on-scroll rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-500/20" style={{ "--reveal-delay": "20ms" }}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
                  <FaBolt />
                </span>
                <h3 className="mt-4 text-lg font-bold">Tốc độ phản hồi cao</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-50/95">
                  Ghép chuyến nhanh, quy trình tinh gọn, giảm thời gian chờ cho khách hàng ở mọi khung giờ.
                </p>
              </article>

              <article className="reveal-on-scroll rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1" style={{ "--reveal-delay": "80ms" }}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <FaMapMarkedAlt />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Theo dõi hành trình rõ ràng</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Trạng thái chuyến, ghế trống, điểm đón trả đều hiển thị minh bạch theo thời gian thực.
                </p>
              </article>

              <article className="reveal-on-scroll rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1" style={{ "--reveal-delay": "140ms" }}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <FaShieldAlt />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">An toàn và đáng tin cậy</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Chuẩn vận hành cho tài xế và dịch vụ hỗ trợ nhanh, giúp mỗi chuyến đi an tâm hơn.
                </p>
              </article>
            </div>

            <div className="reveal-on-scroll mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3" style={{ "--reveal-delay": "180ms" }}>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-slate-900">98%</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng hài lòng</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-slate-900">3 phút</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời gian kết nối trung bình</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-slate-900">24/7</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đội ngũ hỗ trợ liên tục</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 sm:py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="reveal-on-scroll rounded-3xl border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_55%,#eef2ff_100%)] p-6 shadow-sm sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Niềm tin từ trải nghiệm thực tế</p>
                <h3 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
                  "RideUp giúp tôi đặt chuyến nhanh hơn 2 lần và không còn lo bị động thời gian."
                </h3>
                <p className="mt-4 text-sm text-slate-600">
                  Phản hồi từ người dùng được dùng để cải tiến liên tục, từ luồng đặt xe đến dashboard tài xế.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">Khách hàng đánh giá 4.8/5</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Hỗ trợ 24/7</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Theo dõi trạng thái 100%</span>
                </div>
              </article>

              <div className="grid gap-4">
                <article className="reveal-on-scroll rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white" style={{ "--reveal-delay": "60ms" }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Cho khách hàng</p>
                  <h4 className="mt-2 text-xl font-extrabold">Đặt chuyến trong vài giây</h4>
                  <p className="mt-2 text-sm text-slate-300">Không rườm rà, không nhiễu thông tin, chỉ tập trung vào chuyến đi bạn cần.</p>
                  <Link to="/trips/search" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-emerald-200">
                    Mở trang đặt chuyến <FaArrowRight />
                  </Link>
                </article>

                <article className="reveal-on-scroll rounded-2xl border border-emerald-200 bg-emerald-50 p-6" style={{ "--reveal-delay": "120ms" }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Cho tài xế</p>
                  <h4 className="mt-2 text-xl font-extrabold text-slate-900">Vận hành chủ động, tăng hiệu suất</h4>
                  <p className="mt-2 text-sm text-slate-600">Quản lý chuyến, ghế trống và doanh thu trên một dashboard trực quan.</p>
                  <Link to="/auth/register" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-emerald-700">
                    Đăng ký lái xe ngay <FaArrowRight />
                  </Link>
                </article>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;
