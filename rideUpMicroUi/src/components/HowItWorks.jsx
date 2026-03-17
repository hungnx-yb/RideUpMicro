const steps = [
  {
    id: "01",
    title: "Đăng ký tài khoản",
    description: "Tạo tài khoản miễn phí với số điện thoại chỉ trong vài bước ngắn.",
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "02",
    title: "Tìm chuyến xe",
    description: "Tìm kiếm chuyến xe theo tuyến đường và thời gian phù hợp.",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "03",
    title: "Đặt chỗ và thanh toán",
    description: "Xác nhận nhanh và thanh toán an toàn ngay trên ứng dụng.",
    image:
      "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "04",
    title: "Lên xe và đi thôi",
    description: "Tài xế đón đúng điểm hẹn và khởi hành đúng giờ mỗi ngày.",
    image:
      "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=600&q=80",
  },
];

function HowItWorks() {
  return (
    <section className="bg-[#f6f3ee] py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="reveal-on-scroll mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Cách hoạt động
          </h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Chỉ với 4 bước đơn giản để bắt đầu chuyến đi tiết kiệm với RideUp.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <article
              key={step.id}
              className="reveal-on-scroll group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              style={{ "--reveal-delay": `${120 + index * 90}ms` }}
            >
              <div className="relative h-36 overflow-hidden">
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span className="absolute bottom-3 left-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-xs font-bold text-white">
                  {step.id}
                </span>
              </div>

              <div className="space-y-2 p-4">
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
