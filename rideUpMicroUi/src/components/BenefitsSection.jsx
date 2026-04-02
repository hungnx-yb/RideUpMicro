import { FaShieldAlt, FaCoins, FaRegClock, FaMobileAlt } from "react-icons/fa";

const benefits = [
  {
    icon: FaShieldAlt,
    title: "An toàn và uy tín",
    description: "Tất cả tài xế được xác minh danh tính, xử lý sự cố nhanh chóng.",
    iconBg: "bg-slate-800",
    iconShadow: "shadow-slate-800/25",
  },
  {
    icon: FaCoins,
    title: "Giá cả hợp lý",
    description: "Tối ưu chi phí đi lại với hệ thống gợi ý giá minh bạch.",
    iconBg: "bg-emerald-500",
    iconShadow: "shadow-emerald-500/30",
  },
  {
    icon: FaRegClock,
    title: "Đúng giờ",
    description: "Cảnh báo và cập nhật thời gian xe đến theo thời gian thực.",
    iconBg: "bg-gradient-to-r from-emerald-500 to-teal-500",
    iconShadow: "shadow-emerald-500/30",
  },
  {
    icon: FaMobileAlt,
    title: "Dễ sử dụng",
    description: "Đặt chỗ, theo dõi, thanh toán chỉ trong vài thao tác trên điện thoại.",
    iconBg: "bg-gradient-to-r from-slate-700 to-slate-900",
    iconShadow: "shadow-slate-800/25",
  },
];

function BenefitsSection() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="reveal-on-scroll mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Tại sao chọn RideUp?
          </h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Những lợi ích vượt trội khi sử dụng dịch vụ vận chuyển của chúng tôi.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <article
                key={benefit.title}
                  className="reveal-on-scroll group rounded-2xl border border-slate-200 bg-slate-50/70 p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-lg"
                style={{ "--reveal-delay": `${120 + index * 90}ms` }}
              >
                <span
                  className={`mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl text-lg text-white shadow-md transition-transform duration-300 group-hover:scale-110 ${benefit.iconBg} ${benefit.iconShadow}`}
                >
                  <Icon />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default BenefitsSection;
