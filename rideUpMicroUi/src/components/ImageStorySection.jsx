const storyImages = [
  {
    id: "story-1",
    title: "Đón đúng điểm, đi đúng giờ",
    description: "Hình ảnh hành trình thực tế giúp khách hàng tin tưởng hơn ngay từ lần sử dụng đầu tiên.",
    image:
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "story-2",
    title: "Tài xế thân thiện, xe sạch sẽ",
    description: "Mô tả rõ tiêu chuẩn dịch vụ giúp thu hút khách mới và giữ chân khách cũ.",
    image:
      "https://images.unsplash.com/photo-1556122071-e404eaedb77f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "story-3",
    title: "Theo dõi vận hành trực quan",
    description: "Dashboard rõ ràng giúp tài xế quản lý chuyến, doanh thu và lịch làm việc hiệu quả.",
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
  },
];

function ImageStorySection() {
  return (
    <section className="bg-[radial-gradient(circle_at_100%_-20%,#dcfce7_0%,#f8fafc_38%,#f1f5f9_100%)] py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="reveal-on-scroll mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Hình ảnh tạo niềm tin ngay từ cái nhìn đầu
          </h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Bố cục ảnh + mô tả rõ ràng giúp tăng cảm giác chuyên nghiệp, đáng tin cậy cho cả khách hàng và tài xế mới.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {storyImages.map((item, index) => (
            <article
              key={item.id}
              className="reveal-on-scroll group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ "--reveal-delay": `${index * 100}ms` }}
            >
              <div className="h-52 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ImageStorySection;
