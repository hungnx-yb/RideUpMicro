import { Link } from "react-router-dom";
import { FaCarSide, FaUserTie } from "react-icons/fa";

const customerImage =
  "https://images.unsplash.com/photo-1517404215738-15263e9f9178?auto=format&fit=crop&w=1200&q=80";

const driverImage =
  "https://images.unsplash.com/photo-1583391733981-849a0f5d6e19?auto=format&fit=crop&w=1200&q=80";

function AudienceCard({
  badge,
  title,
  description,
  highlights,
  image,
  icon,
  ctaLabel,
  ctaTo,
  tone,
}) {
  const Icon = icon;

  return (
    <article
      className={`reveal-on-scroll group relative overflow-hidden rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${tone}`}
    >
      <div className="relative h-48 overflow-hidden rounded-2xl">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
      </div>

      <div className="mt-5">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
          <Icon className="text-emerald-600" />
          {badge}
        </p>
        <h3 className="mt-3 text-2xl font-extrabold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>

        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {highlights.map((item) => (
            <li key={item} className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {item}
            </li>
          ))}
        </ul>

        <Link
          to={ctaTo}
          className="mt-5 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}

function AudienceSection() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="reveal-on-scroll mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Thiết kế cho cả khách hàng và tài xế
          </h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Mỗi vai trò có trải nghiệm riêng: khách hàng đặt chuyến nhanh, tài xế vận hành dễ và rõ.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <AudienceCard
            badge="Khách hàng"
            icon={FaCarSide}
            title="Đặt chuyến trong vài chạm"
            description="Tìm chuyến gần nhất, xem giá minh bạch, theo dõi trạng thái thanh toán và lịch trình ngay trên một màn hình."
            highlights={[
              "Gợi ý điểm đón/trả dễ hiểu",
              "Thông tin giá và trạng thái rõ ràng",
              "Theo dõi chuyến và lịch sử đặt chỗ",
            ]}
            image={customerImage}
            ctaLabel="Khám phá chuyến đi"
            ctaTo="/trips/search"
            tone="border-slate-200 bg-slate-50/50"
          />

          <AudienceCard
            badge="Tài xế"
            icon={FaUserTie}
            title="Quản lý chuyến chuyên nghiệp"
            description="Tạo chuyến nhanh, theo dõi số ghế, doanh thu và hoạt động trong ngày với dashboard tối ưu cho thao tác thực tế."
            highlights={[
              "Dashboard vận hành theo thời gian thực",
              "Theo dõi doanh thu ngắn gọn",
              "Luồng tạo chuyến trực quan, nhanh",
            ]}
            image={driverImage}
            ctaLabel="Đăng ký làm tài xế"
            ctaTo="/auth/register"
            tone="border-emerald-200 bg-emerald-50/40"
          />
        </div>
      </div>
    </section>
  );
}

export default AudienceSection;
