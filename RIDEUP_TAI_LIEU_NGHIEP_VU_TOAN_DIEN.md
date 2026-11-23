# TÀI LIỆU ĐẶC TẢ NGHIỆP VỤ HỆ THỐNG RIDEUP (RIDEUPMICRO)
## HỆ THỐNG NỀN TẢNG ĐẶT XE GHÉP LIÊN TỈNH THÔNG MINH

> **Phiên bản tài liệu:** v3.2 (Chuẩn hóa toàn diện theo Codebase thực tế: Ma trận Trạng thái, Edge Cases, Khung cước Km, Schedulers ShedLock & Fintech Engine)  
> **Ngày cập nhật:** 21/11/2026  
> **Trạng thái:** Chính thức (Single Source of Truth)  
> **Dành cho:** Thành viên mới, Lập trình viên Backend/Frontend, Kiểm thử viên (QA/QC), Hội đồng Đánh giá Đồ án Tốt nghiệp.

---

## MỤC LỤC TỔNG QUAN

1. [TỔNG QUAN DỰ ÁN VÀ KIẾN TRÚC HỆ THỐNG](#1-tổng-quan-dự-án-và-kiến-trúc-hệ-thống)
   - 1.1. Bối cảnh & Bài toán nghiệp vụ
   - 1.2. Kiến trúc Microservices & Cổng giao tiếp (Tech Stack)
2. [CÁC VAI TRÒ TRONG HỆ THỐNG (ACTORS & ROLES)](#2-các-vai-trò-trong-hệ-thống-actors--roles)
3. [NGUYÊN TẮC QUẢN TRỊ THAM SỐ ĐỘNG (DYNAMIC CONFIGURATION & SLA)](#3-nguyên-tắc-quản-trị-tham-số-động-dynamic-configuration--sla)
   - 3.1. Danh mục Tham số Cấu hình Động Toàn hệ thống (Admin Master Config)
   - 3.2. Cơ chế Đồng bộ Redis Cache & Thống kê Toàn bộ 5 Tiến trình Scheduler chạy ShedLock
4. [ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ: KHÁCH HÀNG (CUSTOMER)](#4-đặc-tả-nghiệp-vụ-phân-hệ-khách-hàng-customer)
   - 4.1. Đăng ký, Xác thực & Hồ sơ
   - 4.2. Tìm kiếm Chuyến xe liên tỉnh
   - 4.3. Đặt vé & Quy trình Tiền mặt vs Thẻ Stripe Pre-Authorization
   - 4.4. Sàn Chợ Nhu Cầu Đi Xe (Passenger Request Marketplace)
   - 4.5. Chỉnh sửa Thông tin Đặt xe (Booking Modification)
   - 4.6. Chính sách Hủy vé & Ràng buộc thời gian (Dynamic Cutoff)
   - 4.7. Giao tiếp Thời gian thực (Chat WebSocket STOMP)
   - 4.8. Đánh giá Chất lượng & Điểm Uy tín (Rating Thực tế)
5. [ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ: TÀI XẾ (DRIVER)](#5-đặc-tả-nghiệp-vụ-phân-hệ-tài-xế-driver)
   - 5.1. Đăng ký Hồ sơ Tài xế & eKYC Sinh trắc học (FaceNet + Anti-Spoofing)
   - 5.2. Đăng ký Phương tiện & Kiểm định Xe
   - 5.3. Khai báo Tỉnh thành Hoạt động (`operatingProvinces`)
   - 5.4. Tạo Chuyến xe (`Trip`) & Kiểm soát Khung cước Trần/Sàn theo Km
   - 5.5. Hàng đợi Duyệt Khách ghép & Duyệt Đổi lộ trình
   - 5.6. Khai thác Sàn Chợ & Gửi Lời mời Ghép khách (`TripRequestInvitation`)
   - 5.7. Vận hành Hành trình (Bắt đầu, Hoàn thành, Hủy chuyến & Vòng đời Tự động)
   - 5.8. Quản trị Tài chính: Ví công nợ hoa hồng, Hạn mức nợ & Stripe Connect
6. [ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ: QUẢN TRỊ VIÊN (ADMIN)](#6-đặc-tả-nghiệp-vụ-phân-hệ-quản-trị-viên-admin)
   - 6.1. Thẩm định & Duyệt Hồ sơ Tài xế
   - 6.2. Thẩm định & Duyệt Phương tiện
   - 6.3. Cấu hình Tham số Hoa hồng Động theo Rating & Điểm Uy tín
   - 6.4. Báo cáo Thống kê Doanh thu & Quản trị Công nợ Toàn hệ thống
   - 6.5. Cấu hình Động Thời gian Timeout Vận hành (SLA)
   - 6.6. Cấu hình Động Khung cước Trần/Sàn theo Km (`FareBoundaryConfig`)
   - 6.7. Trung tâm Phát sóng Thông báo Thủ công Đa kênh (Push Broadcast)
7. [MÔ HÌNH DÒNG TIỀN VÀ THUẬT TOÁN TÀI CHÍNH (FINTECH ENGINE)](#7-mô-hình-dòng-tiền-và-thuật-toán-tài-chính-fintech-engine)
   - 7.1. Kiến trúc C2C Direct Payment + B2B Platform Debt
   - 7.2. Cơ chế Stripe Pre-Authorization (`HOLDING`), Capture (`PAID`) & Split Payouts
   - 7.3. Thuật toán Cấn trừ nợ Tiền mặt tự động (Auto Debt Offset - 3 Kịch bản)
   - 7.4. Công thức Tính Hoa hồng Cá nhân hóa ($R_{final}$) theo Rating Thực tế
8. [CHUYÊN ĐỀ SÂU: MA TRẬN CHUYỂN TRẠNG THÁI VÀ XỬ LÝ TOÀN DIỆN CÁC EDGE CASES](#8-chuyên-đề-sâu-ma-trận-chuyển-trạng-thái-và-xử-lý-toàn-diện-các-edge-cases)
   - 8.1. Ma trận Chuyển trạng thái Đặt vé (`BookingStatus`) & Xử lý Edge Cases
   - 8.2. Ma trận Chuyển trạng thái Chuyến xe (`TripStatus`) & Xử lý Edge Cases
   - 8.3. Ma trận Chuyển trạng thái Chợ Nhu Cầu (`TripRequest` & `Invitation`)
   - 8.4. Ma trận Chuyển trạng thái Yêu cầu Sửa vé (`BookingModification`)
   - 8.5. Ma trận Chuyển trạng thái Payout Ví Tài xế (`PayoutStatus`)
   - 8.6. Ma trận Chuyển trạng thái Giao dịch Thanh toán (`PaymentStatus`)
   - 8.7. Ma trận Chuyển trạng thái Hoàn tiền & Hủy ủy quyền (`RefundStatus`)
   - 8.8. Bản đồ Sự kiện Apache Kafka & Tính Idempotent chống trùng lặp
   - 8.9. Bảng Tổng hợp Kiểm định Trạng thái Enum Toàn Hệ thống (Audit Codebase)
9. [HƯỚNG DẪN DÀNH CHO NGƯỜI MỚI (ONBOARDING GUIDE)](#9-hướng-dẫn-dành-cho-người-mới-onboarding-guide)

---

# 1. TỔNG QUAN DỰ ÁN VÀ KIẾN TRÚC HỆ THỐNG

### 1.1. Bối cảnh & Bài toán nghiệp vụ
Tại Việt Nam, nhu cầu di chuyển liên tỉnh bằng hình thức **xe ghép (ridesharing / carpooling)** diễn ra rất phổ biến nhưng chủ yếu mang tính tự phát qua các hội nhóm Facebook, Zalo hoặc trung gian ("cò xe"). Thực trạng này tồn tại nhiều bất cập:
- **Thiếu an toàn & minh bạch:** Không có hồ sơ xác thực danh tính tài xế, không biết tình trạng kiểm định phương tiện.
- **Rủi ro bùng chuyến:** Khách hoặc tài xế tự ý hủy chuyến cận giờ mà không có chế tài xử lý và bồi thường minh bạch.
- **Khách không tìm được xe:** Khi tìm kiếm chuyến cố định không có kết quả, khách đành quay lại các hội nhóm thủ công.
- **Thất thoát công nợ hoa hồng:** Các chuyến thanh toán tiền mặt trực tiếp cho tài xế khiến nền tảng khó thu phí sàn nếu không có cơ chế ký quỹ hoặc cấn trừ nợ tự động.

**RideUp** ra đời nhằm số hóa toàn diện quy trình xe ghép liên tỉnh:
1. Xác minh danh tính tài xế kết hợp **AI Sinh trắc học (eKYC FaceNet InceptionResnetV1 + Anti-Spoofing MiniFASNet)**.
2. Quản lý ghế thông minh bằng cơ chế **Optimistic Locking (`@Version`)** trên entity chuyến xe để ngăn chặn bán quá số ghế (overbooking).
3. **Sàn Chợ Nhu Cầu Di Chuyển (Passenger Request Marketplace):** Kết nối 2 chiều; khi khách tìm không thấy chuyến phù hợp, khách đăng yêu cầu tìm xe lên Chợ để các tài xế có lộ trình tương thích chủ động gửi lời mời ghép.
4. **Kiểm soát Khung giá cước Trần/Sàn theo Km (`FareBoundaryConfig`):** Ngăn chặn tình trạng tài xế phá giá hoặc nâng giá bất hợp lý.
5. Giải quyết bài toán dòng tiền thông minh bằng mô hình **C2C Direct Payment + B2B Debt qua Stripe Connect**, tự động tạm giữ (Pre-authorization/Hold) tiền thẻ của khách, capture khi hoàn thành chuyến, tự động cấn trừ nợ tiền mặt cũ và kiểm soát **Hạn mức nợ (Credit Limit)** linh hoạt.

---

### 1.2. Kiến trúc Microservices & Cổng giao tiếp (Tech Stack)

```
                               ┌─────────────────────────────────────────┐
                               │        API GATEWAY (Port 8080)          │
                               │  Spring Cloud Gateway + JWT Auth Filter │
                               └────────────────────┬────────────────────┘
                                                    │
         ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
         ▼                   ▼                     ▼                     ▼                   ▼
┌─────────────────┐ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ ┌─────────────────┐
│identity-service │ │ booking-service │   │  trip-service   │   │ payment-service │ │locationservice  │
│   (Port 8081)   │ │   (Port 8082)   │   │   (Port 8083)   │   │   (Port 8084)   │ │   (Port 8087)   │
│ User/Auth, eKYC │ │ Booking Saga,   │   │ Chuyến xe, Ghế, │   │ Stripe Connect, │ │ Quản lý Tỉnh/Xã,│
│ Driver, Xe, Nợ, │ │ Modif 15p SLA,  │   │ Sàn Chợ nhu cầu,│   │ Payouts, Offset │ │ danh mục hành   │
│ Hoa hồng động   │ │ Timeout config  │   │ Mời khách ghép, │   │ nợ, Sổ cái ví,  │ │ chính, điểm dừng│
│ Token cleanup   │ │ Booking Sweeper │   │ Fare Boundary   │   │ Pre-Auth & Void │ │ đón trả tinh gọn│
└────────┬────────┘ └────────┬────────┘   └────────┬────────┘   └────────┬────────┘ └────────┬────────┘
         │                   │                     │                     │                   │
         └───────────────────┴──────────┬──────────┴─────────────────────┴───────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│    chat_service     │      │notification-service │      │   review-service    │
│     (Port 8085)     │      │     (Port 8086)     │      │     (Port 8088)     │
│ SockJS/STOMP Chat,  │      │ FCM Push, In-App    │      │ Đánh giá sao 1-5,   │
│ Lưu trữ tin nhắn    │      │ Inbox, Broadcast    │      │ Rating thực tế trung│
│ phòng chat theo vé  │      │ Smart Push theo tỉnh│      │ bình của tài xế     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              ┌─────────────────────┐       ┌─────────────────────┐
              │     ai-service      │       │  discovery-server   │
              │     (Port 8000)     │       │     (Port 8761)     │
              │ FastAPI, FaceNet    │       │ Netflix Eureka      │
              │ Anti-Spoofing Liveness      │ Service Registry    │
              └─────────────────────┘       └─────────────────────┘
```

---

# 2. CÁC VAI TRÒ TRONG HỆ THỐNG (ACTORS & ROLES)

| Vai trò (Actor) | Phạm vi Ứng dụng | Mục tiêu Nghiệp vụ |
| :--- | :--- | :--- |
| **Khách hàng (Customer)** | Mobile App (`rideup-customer-app`) | Tìm kiếm chuyến liên tỉnh theo tỉnh/xã; chọn điểm đón/trả tinh gọn (chọn Phường/Xã từ danh sách điểm dừng của chuyến và nhập địa chỉ chi tiết số nhà, tên đường, ngõ ngách); đặt vé với thanh toán Tiền mặt hoặc Thẻ Stripe (tạm giữ trước qua PaymentSheet); đăng nhu cầu tìm xe lên Sàn Chợ khi hết chuyến; đề xuất sửa điểm đón/trả có kiểm soát; hủy vé trước giờ cutoff; giao tiếp chat thời gian thực; chấm điểm sao thực tế cho tài xế sau chuyến đi. |
| **Tài xế (Driver)** | Mobile App (`rideup-driver-app`) | Nộp hồ sơ xác minh CCCD/GPLX kết hợp chụp ảnh selfie sinh trắc học eKYC; đăng ký phương tiện và giấy tờ kiểm định; đăng ký tối đa 5 tỉnh hoạt động để nhận thông báo tìm xe; tạo chuyến xe liên tỉnh có kiểm tra giá vé theo khung cước Km; duyệt hoặc từ chối hành khách trong hàng đợi (xem địa chỉ đón/trả chi tiết); lướt Sàn Chợ để chủ động gửi lời mời ghép; tiếp nhận và duyệt/từ chối sửa đổi lộ trình; thực hiện hành trình (`STARTED` $\rightarrow$ `COMPLETED`); quản lý ví công nợ, nhận tiền tự động qua Stripe Connect hoặc nạp tiền trả nợ sàn. |
| **Quản trị viên (Admin)** | Web Portal (`rideUpMicroUi`) | Thẩm định và phê duyệt/từ chối hồ sơ tài xế và phương tiện; quản trị tham số hoa hồng động (đòn bẩy Rating và Điểm uy tín, hạn mức nợ); cấu hình động các mốc SLA timeout vận hành; cấu hình khung cước trần/sàn Km; theo dõi thống kê doanh thu toàn sàn và công nợ tài xế; phát sóng thông báo khẩn cấp đa kênh. |

---

# 3. NGUYÊN TẮC QUẢN TRỊ THAM SỐ ĐỘNG (DYNAMIC CONFIGURATION & SLA)

> [!IMPORTANT]
> **Quy định bắt buộc:** Mọi mốc thời gian (giờ/phút), tỷ lệ hoa hồng, hạn mức nợ và khung giá cước tham chiếu theo km trong hệ thống **ĐỀU LÀ THAM SỐ ĐỘNG (Dynamic Parameters)** do Quản trị viên (Admin) thiết lập qua Web Dashboard, được lưu trữ trong CSDL và đồng bộ qua Redis Cache. Mọi microservice đọc tham số từ Redis/CSDL trong thời gian thực, không sử dụng hằng số tĩnh bất biến.

### 3.1. Danh mục Tham số Cấu hình Động Toàn hệ thống (Admin Master Config)

Dưới đây là bảng tổng hợp chính xác toàn bộ các tham số cấu hình động được triển khai trong mã nguồn thực tế:

| Mã Tham số (Mã nguồn) | Tên Nghiệp vụ | Giá trị Mặc định (Codebase) | Miền Giá trị Cho phép | Service Quản lý | Ý nghĩa Vận hành & Hành vi Hệ thống |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `BOOKING_DRIVER_APPROVAL_TIMEOUT` | Thời hạn Tài xế Duyệt vé | **120 phút** *(2 giờ)* | 5 – 1.440 phút (rm) | `booking-service` | Thời gian tối đa để tài xế duyệt vé trong hàng đợi. Hệ thống tự động đặt `expiresAt = min(now + timeout, departureTime - 1h)`. Quá hạn, scheduler tự động chuyển `EXPIRED`, giải phóng hold tiền thẻ. |
| `BOOKING_PAYMENT_TIMEOUT` | Thời hạn Thanh toán Stripe | **60 phút** *(1 giờ)* | 5 – 180 phút (rm) | `booking-service` | Áp dụng cho các đơn Stripe chưa hoàn tất xác thực thẻ. Quá hạn, tự động chuyển `EXPIRED` do timeout thanh toán. |
| `BOOKING_MODIFICATION_RESPONSE_TIMEOUT` | Thời hạn Duyệt Sửa Lộ trình | **15 phút** | 5 – 120 phút (rm) | `booking-service` | Thời gian tối đa để tài xế duyệt điểm đón/trả mới. Đặt `expiresAt = min(now + timeout, departureTime - 30p)`. Quá hạn, chuyển `EXPIRED`, giữ nguyên thông tin vé gốc. |
| `CUSTOMER_CANCEL_CUTOFF` | Mốc Chặn Khách Tự Hủy Vé | **120 phút** *(2 giờ)* | 0 – 1.440 phút (rm) | `booking-service` | Khách chỉ được hủy vé trước giờ khởi hành $\ge$ mốc này. Khi thời gian đến giờ chạy $< 120$ phút, hệ thống ném ngoại lệ `CANCELLATION_CUTOFF_EXCEEDED` chặn hủy vé. |
| `MARKETPLACE_REQUEST_TTL` | Thời gian Tồn tại Yêu cầu Chợ | **1.440 phút** *(24 giờ)* | 30 – 4.320 phút (rm) | `trip-service` | Thời gian tối đa yêu cầu tìm xe hiển thị trên Sàn Chợ. Quá hạn, scheduler chuyển `TripRequest` sang `EXPIRED`, và chuyển các lời mời `PENDING` sang `REJECTED`. |
| `CUTOFF_MODIFICATION` | Mốc Giờ Tối thiểu Đề xuất Sửa vé | **2 giờ** | Cố định nghiệp vụ | `booking-service` | Khách chỉ được gửi yêu cầu sửa điểm đón/trả trước giờ xe chạy tối thiểu 2 giờ. |
| `MAX_MODIF_PER_BOOKING` | Số lần Tối đa Cho phép Sửa vé | **2 lần** | Cố định nghiệp vụ | `booking-service` | Một vé chỉ được sửa đổi lộ trình thành công tối đa 2 lần để tránh gây xáo trộn hành trình xe. |
| `COMMISSION_BASE_RATE` (`baseRate`) | Tỷ lệ Hoa hồng Cơ sở ($R_{base}$) | **18.00%** (`0.1800`) | 10.00% – 30.00% | `identity-service` | Tỷ lệ chuẩn ban đầu để tính hoa hồng cá nhân hóa cho từng tài xế. |
| `COMMISSION_MIN_RATE` (`minRate`) | Tỷ lệ Hoa hồng Sàn Ưu đãi ($R_{min}$) | **12.00%** (`0.1200`) | 5.00% – 20.00% | `identity-service` | Mức hoa hồng sàn tối thiểu dành cho tài xế có Rating cao và Điểm Uy Tín xuất sắc. |
| `COMMISSION_MAX_RATE` (`maxRate`) | Tỷ lệ Hoa hồng Trần Phạt ($R_{max}$) | **25.00%** (`0.2500`) | 20.00% – 40.00% | `identity-service` | Mức hoa hồng sàn tối đa áp dụng cho tài xế có Rating kém hoặc Điểm Uy Tín thấp. |
| `RATING_BENCHMARK` / `STEP` | Mốc Chuẩn & Bước Nhảy Rating | **4.5 sao** / **2.00%/sao** | Động | `identity-service` | Mỗi 1.0 sao lệch chuẩn 4.5 làm tăng/giảm 2.0% tỷ lệ hoa hồng áp dụng. |
| `REPUTATION_BENCHMARK` / `STEP` | Mốc Chuẩn & Bước Nhảy Điểm Uy Tín | **80 điểm** / **1.00%/10đ** | Động | `identity-service` | Mỗi 10 điểm uy tín lệch chuẩn 80 làm tăng/giảm 1.0% tỷ lệ hoa hồng áp dụng. |
| `CREDIT_LIMIT` (`creditLimit`) | Hạn mức Nợ Tiền mặt Tối đa | **500.000 đ** | Động theo Admin | `identity-service` | Ngưỡng dư nợ hoa hồng tối đa. Khi $systemDebt \ge 500.000$đ, hệ thống tự động khóa quyền tạo chuyến và khóa duyệt đơn vé tiền mặt. |
| `MIN_ACCEPT_SCORE` | Ngưỡng Điểm Uy tín Nhận chuyến | **50 điểm** | Động theo Admin | `identity-service` | Tài xế có điểm uy tín $< 50$ bị hệ thống chặn duyệt đơn và chặn tạo chuyến mới. |
| `FARE_BOUNDARY_MIN_PRICE_PER_KM` | Đơn giá Sàn Mỗi Km Mỗi Ghế | **1.200 đ/km/ghế** | Động | `trip-service` | Ngưỡng giá tối thiểu nhằm ngăn ngừa tài xế phá giá chuyến đi liên tỉnh. |
| `FARE_BOUNDARY_MAX_PRICE_PER_KM` | Đơn giá Trần Mỗi Km Mỗi Ghế | **4.000 đ/km/ghế** | Động | `trip-service` | Ngưỡng giá tối đa nhằm ngăn ngừa tài xế ép giá, "chặt chém" khách hàng. |
| `FARE_BOUNDARY_ROAD_FACTOR` | Hệ số Chuyển đổi Đường bộ | **1.30** | Động | `trip-service` | Hệ số nhân khoảng cách đường chim bay Haversine giữa tâm 2 tỉnh để ước lượng khoảng cách cước đường bộ thực tế. |
| `AUTO_CANCEL_UNSTARTED_TRIP` | Timeout Tự động Hủy Chuyến Chưa Chạy | **1 giờ** *(sau departureTime)* | Cố định Scheduler | `trip-service` | Quá 1 giờ sau giờ khởi hành mà tài xế không bấm Bắt đầu, chuyến tự động hủy và hoàn tiền cho khách. |
| `AUTO_COMPLETE_FINISHED_TRIP` | Timeout Tự động Hoàn thành Chuyến | **30 phút** *(sau arrivalTime)* | Cố định Scheduler | `trip-service` | Quá 30 phút sau giờ đến dự kiến mà tài xế không bấm Hoàn tất, chuyến tự động hoàn thành và quyết toán tiền. |

---

### 3.2. Cơ chế Đồng bộ Redis Cache & Thống kê Toàn bộ 5 Tiến trình Scheduler chạy ShedLock

#### Cơ chế Đồng bộ Redis Cache:
1. **Lưu trữ & Phân phối:** Bảng cấu hình lưu trong MySQL. Khi Quản trị viên cập nhật, hệ thống ghi đè CSDL và xóa/làm mới Redis Cache (TTL 24h). Các service nghiệp vụ đọc trực tiếp từ Redis để bảo đảm tốc độ phản hồi $< 5\text{ms}$. Khi có thay đổi quan trọng (như hoa hồng), Kafka event được phát đi để xóa cache cục bộ trên các dịch vụ liên quan.
2. **Khóa phân tán ShedLock:** Trong mô hình Microservices đa instance (Cluster), các tiến trình Scheduler chạy ngầm định kỳ sử dụng **ShedLock lưu trạng thái trên Redis** (bảng khóa `shedlock`), bảo đảm tại mỗi chu kỳ chỉ có **DUY NHẤT 1 NODE** được thực thi lệnh quét, loại bỏ hoàn toàn nguy cơ xung đột dữ liệu phân tán (Race Condition).

#### Bảng Thống kê Toàn bộ 5 Tiến trình Scheduler trong Codebase:

| STT | Tên Scheduler Class & Method | Service Sở hữu | Chu kỳ Thực thi | Tên Khóa ShedLock (`@SchedulerLock`) | Điều kiện Quét & Hành vi Nghiệp vụ Xử lý |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **1** | `BookingExpireScheduler.expirePendingBookings` | `booking-service` | Mỗi 60 giây (`fixedDelay = 60000`) | `BookingExpireScheduler_expirePending`<br>*(atLeast 15s, atMost 50s)* | Quét các bản ghi `Booking` có trạng thái `PENDING_PAYMENT` hoặc `WAITING_DRIVER_APPROVAL` và `expiresAt <= now`. Chuyển sang `EXPIRED`, đặt `paymentStatus = FAILED`. **Lưu ý:** Đơn hết hạn chưa từng được duyệt nên chưa trừ ghế $\rightarrow$ Không cần release ghế. |
| **2** | `BookingModificationService.expirePendingModifications` | `booking-service` | Mỗi 60 giây (`fixedDelay = 60000`) | `BookingModification_expirePending`<br>*(atLeast 15s, atMost 50s)* | Quét các yêu cầu sửa đổi `BookingModification` có trạng thái `PENDING_DRIVER` và `expiresAt <= now`. Chuyển sang `EXPIRED`, giữ nguyên thông tin vé gốc, phát Kafka `BookingModificationResolvedEvent` thông báo cho khách. |
| **3** | `TripLifecycleScheduler.sweepTripLifecycle` | `trip-service` | Mỗi 1 phút (`cron = "0 */1 * * * *"`) | `TripLifecycleScheduler_sweepTripLifecycle`<br>*(atLeast 20s, atMost 50s)* | Thực thi 2 tác vụ vòng đời chuyến xe:<br>1. **Tự động Hủy chuyến:** Quá 1 giờ sau giờ khởi hành (`departureTime <= now - 1h`) mà chuyến vẫn ở `OPEN` hoặc `FULL` (tài xế không bắt đầu chuyến) $\rightarrow$ chuyển sang `CANCELED`, phát Kafka `TripCancelledEvent` để tự động hủy toàn bộ vé và hoàn tiền cho khách.<br>2. **Tự động Hoàn tất chuyến:** Quá 30 phút sau giờ đến dự kiến (`estimatedArrivalTime <= now - 30m`, hoặc fallback quá 4 giờ sau xuất phát) mà chuyến đang ở `STARTED` $\rightarrow$ chuyển sang `COMPLETED`, phát Kafka `TripCompletedEvent` để kích hoạt giải ngân Payout ví tài xế. |
| **4** | `TripRequestExpireScheduler.expireOldTripRequests` | `trip-service` | Mỗi 1 phút (`cron = "0 * * * * *"`) | `TripRequestExpireScheduler_expireRequests`<br>*(atLeast 15s, atMost 50s)* | Quét các yêu cầu tìm xe trên Chợ `TripRequest` có trạng thái `OPEN` và `expiresAt <= now`. Chuyển `TripRequest` sang `EXPIRED`, đồng thời chuyển toàn bộ các lời mời `TripRequestInvitation` đang `PENDING` sang `REJECTED`, phát Kafka `TripRequestCancelEvent` và `InvitationRejectedEvent`. |
| **5** | `AuthenticationService.cleanupExpiredTokens` | `identity-service` | 02:00 sáng hàng ngày (`cron = "0 0 2 * * ?"`) | Quản lý độc lập theo Spring Transaction | Quét bảng `refresh_tokens`, xóa vĩnh viễn các token đã hết hạn (`deleteExpiredTokens(now)`) để giải phóng dung lượng CSDL. |

---

# 4. ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ: KHÁCH HÀNG (CUSTOMER)

### 4.1. Đăng ký, Xác thực & Hồ sơ
- **Đăng ký:** Email duy nhất, mật khẩu mã hóa BCrypt, họ tên, số điện thoại, ngày sinh, giới tính.
- **Xác thực Email:** Mã token kích hoạt gửi về hòm thư người dùng. Chỉ tài khoản đã xác thực (`verified = true`) mới được đăng nhập.
- **Phiên làm việc JWT:** Hệ thống cấp cặp `accessToken` (ngắn hạn) và `refreshToken` (dài hạn lưu trữ CSDL, có kiểm tra thu hồi).

### 4.2. Tìm kiếm Chuyến xe liên tỉnh
- Lọc theo Tỉnh/Xã điểm đi, Tỉnh/Xã điểm đến và Ngày khởi hành mong muốn.
- Tìm kiếm hỗ trợ tiếng Việt không dấu.
- Danh sách chuyến hiển thị đầy đủ: Thời gian xuất phát, điểm dừng dự kiến, ảnh xe, biển số, tên tài xế, số sao đánh giá thực tế của tài xế, số ghế còn trống và giá vé niêm yết cho từng ghế.
- **Quy tắc Duyệt vé của Hệ thống:** Toàn bộ chuyến xe thông thường do tài xế tạo đều áp dụng cơ chế duyệt thủ công (`MANUAL_APPROVAL`). Mọi yêu cầu đặt vé của khách phải được tài xế xem xét và duyệt mới chính thức chốt ghế.

### 4.3. Đặt vé & Quy trình Tiền mặt vs Thẻ Stripe Pre-Authorization
1. **Kiểm tra Chống trùng vé (`checkDuplicateBooking`):**
   Hệ thống kiểm tra nếu khách hàng đã có vé đang hoạt động (`PENDING_PAYMENT`, `WAITING_DRIVER_APPROVAL`, `CONFIRMED`) trên cùng chuyến xe đó thì ném lỗi `BOOKING_ALREADY_EXISTS`, ngăn chặn việc đặt trùng lặp.
2. **Quy trình Chọn điểm đón/trả tinh gọn (Dropdown Phường/Xã + Nhập địa chỉ chi tiết):**
   Nhằm tối ưu hóa giao diện di động, tăng tốc độ thao tác và loại bỏ sự phức tạp của bản đồ ghim tọa độ, hệ thống sử dụng quy trình chọn điểm đón/trả tinh gọn:
   - *Bước 1 (Chọn Phường/Xã):* Khách hàng chọn Phường/Xã đón và trả từ danh sách các điểm dừng (`stops`) thuộc lộ trình của chuyến xe.
   - *Bước 2 (Nhập địa chỉ chi tiết):* Khách hàng nhập số nhà, tên đường, ngõ ngách hoặc mốc nhận diện (Text Input). Địa chỉ này được lưu trực tiếp vào thông tin vé (`addressText`) để tài xế dễ dàng nhận biết vị trí đón trả mà không cần mở bản đồ.
3. **Luồng Thanh toán Tiền mặt (`CASH`):**
   - Đơn vé được tạo ở trạng thái `WAITING_DRIVER_APPROVAL` với `paymentStatus = PENDING`.
   - Hạn chót duyệt đơn được tính: `expiresAt = min(now + SLA_DRIVER_APPROVAL (120 phút), departureTime - 1h)`.
   - Tài xế nhận thông báo kèm điểm đón chi tiết để duyệt đón.
4. **Luồng Thanh toán Thẻ Trực tuyến (`STRIPE` Pre-Authorization):**
   - Điều kiện tiên quyết: Chuyến xe chỉ mở phương thức thanh toán Thẻ nếu tài xế chuyến đó đã hoàn tất liên kết tài khoản Stripe Connect nhận tiền (`stripePayoutsEnabled = true`).
   - **Cơ chế Giữ tiền trước (Pre-Authorization / Manual Capture):**
     1. Khách hàng bấm thanh toán Thẻ $\rightarrow$ Ứng dụng gọi `/payments/create-intent` sang `payment-service`.
     2. `payment-service` gọi Stripe API tạo `PaymentIntent` với tùy chọn `capture_method = MANUAL` (chỉ ủy quyền giữ tiền trên thẻ của khách, chưa thực thu).
     3. Khách nhập thẻ và xác thực thành công qua Stripe PaymentSheet.
     4. Ứng dụng gửi yêu cầu đặt vé kèm `paymentIntentId`.
     5. Backend `booking-service` nhận thấy giao dịch đã giữ tiền trước (`isStripePrePaid = true`) $\rightarrow$ Đơn vé chuyển thẳng sang `WAITING_DRIVER_APPROVAL` với trạng thái thanh toán là **`PaymentStatus.HOLDING`**.
     6. Nếu tài xế duyệt đón: Đơn vé chuyển sang `CONFIRMED`. Tiền vẫn được giữ an toàn ở Stripe. Tiền chỉ chính thức được thu (`capture`) và chuyển thành `PAID` khi chuyến xe hoàn tất (`COMPLETED`).
     7. Nếu tài xế từ chối (`REJECTED_BY_DRIVER`), quá hạn duyệt (`EXPIRED`), hoặc khách hủy vé hợp lệ (`CANCELLED_USER`): Hệ thống tự động gọi hủy ủy quyền giữ tiền (Void Authorization), `PaymentStatus` chuyển sang `VOIDED`, `RefundStatus` là `SUCCESS`, không phát sinh phí cho khách hàng.
5. **Trường hợp Đặt vé từ Sàn Chợ (`isFromInvitation`):**
   - Khi khách hàng chấp nhận một lời mời từ tài xế trên Sàn Chợ, do tài xế đã chủ động mời nên vé được chuyển thẳng sang **`CONFIRMED`** (đối với cả Tiền mặt lẫn Thẻ Stripe đã pre-auth), đồng thời hệ thống thực hiện trừ ghế trực tiếp trên `trip-service`.

### 4.4. Sàn Chợ Nhu Cầu Đi Xe (Passenger Request Marketplace)
- **Đăng yêu cầu tìm xe:** Khi tìm kiếm không có chuyến xe phù hợp, khách hàng bấm **[Đăng yêu cầu tìm xe]**. Khách nhập lộ trình đón/trả, khung giờ khởi hành mong muốn, số lượng ghế cần đặt và ghi chú. Bản ghi `TripRequest` được tạo ở trạng thái `OPEN` với thời hạn tồn tại theo cấu hình `MARKETPLACE_REQUEST_TTL` (mặc định 24 giờ).
- **Phát sóng thông minh (Smart Push):** `trip-service` phát sự kiện Kafka `trip-request-created`, hệ thống gửi thông báo đẩy tới các tài xế đã đăng ký hoạt động tại tỉnh tương ứng.
- **So sánh và Chấp thuận lời mời:** Các tài xế có lộ trình phù hợp gửi lời mời ghép xe (`TripRequestInvitation`). Khách hàng có thể so sánh giá vé, thời gian đón và loại xe giữa các tài xế, sau đó bấm **[Chấp thuận lời mời]** để chuyển đổi thành vé chính thức trong một giao dịch nguyên tử.

### 4.5. Chỉnh sửa Thông tin Đặt xe (Booking Modification)
- Hệ thống hỗ trợ khách hàng thay đổi điểm đón/trả (`pickupAddressText`, `dropoffAddressText`, tọa độ, phường/xã), thông tin người đi hộ (`passengerName`, `passengerPhone`) và ghi chú (`note`).
- **Hai cơ chế xử lý sửa đổi theo trạng thái vé (`BookingModificationService.java`):**
  1. **Khi vé đang chờ tài xế duyệt (`WAITING_DRIVER_APPROVAL`):**
     - Do tài xế chưa chốt nhận khách, hệ thống **tự động cập nhật trực tiếp lộ trình mới vào vé** ngay lập tức.
     - Lưu bản ghi lịch sử chỉnh sửa với trạng thái **`APPROVED`** tự động. Tài xế khi mở danh sách chờ duyệt sẽ nhìn thấy ngay lộ trình mới nhất để quyết định nhận hay từ chối.
  2. **Khi vé đã được xác nhận (`CONFIRMED`):**
     - Do vé đã chốt trước đó, việc thay đổi đón/trả ảnh hưởng trực tiếp đến kế hoạch di chuyển của tài xế và các hành khách khác trên xe.
     - Hệ thống tạo yêu cầu chỉnh sửa ở trạng thái **`PENDING_DRIVER`**, phát sự kiện Kafka `BookingModificationRequestedEvent` gửi thông báo đẩy (Push Notification) tới tài xế.
     - Tài xế mở giao diện so sánh lộ trình Cũ vs Mới và có quyền: **Chấp thuận** (`APPROVED` $\rightarrow$ cập nhật vào vé) hoặc **Từ chối** (`REJECTED` $\rightarrow$ giữ nguyên vé ban đầu).
- **Các quy tắc nghiệp vụ ràng buộc:**
  - **Quy tắc 1 (Số lần tối đa):** Mỗi vé chỉ được phép sửa đổi thành công tối đa **2 lần** (`approvedCount < 2`).
  - **Quy tắc 2 (Cutoff thời gian):** Khách chỉ được gửi yêu cầu sửa vé trước giờ khởi hành tối thiểu **2 tiếng** (`departureTime >= now + 2h`).
  - **Quy tắc 3 (Hạn mức đang chờ):** Mỗi vé chỉ được có tối đa 1 yêu cầu sửa đổi ở trạng thái chờ phản hồi (`PENDING_DRIVER`) tại một thời điểm.
  - **Quy tắc 4 (SLA phản hồi của tài xế):** Tài xế có thời hạn SLA là **15 phút** (`BOOKING_MODIFICATION_RESPONSE_TIMEOUT`) để phản hồi, muộn nhất trước giờ khởi hành 30 phút. Quá thời hạn này, Scheduled Job `expirePendingModifications` (chạy mỗi 60 giây) sẽ tự động đánh dấu yêu cầu là **`EXPIRED`**, bắn Kafka `BookingModificationResolvedEvent` thông báo cho khách và giữ nguyên vé ban đầu.

### 4.6. Chính sách Hủy vé & Ràng buộc thời gian (Dynamic Cutoff)
- Khách hàng được phép hủy vé khi ở trạng thái `WAITING_DRIVER_APPROVAL` hoặc `CONFIRMED`.
- **Ràng buộc Cutoff:** Đối với vé đã xác nhận (`CONFIRMED`), khách bắt buộc phải hủy trước giờ khởi hành tối thiểu theo tham số cấu hình `CUSTOMER_CANCEL_CUTOFF` (mặc định là **2 tiếng / 120 phút**).
- Nếu thời gian còn lại đến giờ xe chạy $< 2$ tiếng, hệ thống sẽ chặn chức năng hủy vé để bảo vệ quyền lợi và chi phí chuẩn bị của tài xế.
- Khi hủy vé hợp lệ: Hệ thống tự động giải phóng ghế trên chuyến đi và kích hoạt quy trình hoàn tiền hoặc hủy giữ tiền thẻ Stripe tương ứng.

### 4.7. Giao tiếp Thời gian thực (Chat WebSocket STOMP)
- Sau khi vé được tạo, hệ thống tự động kích hoạt phòng chat riêng biệt gắn với mã đặt vé (`bookingId`).
- Sử dụng giao thức WebSocket STOMP/SockJS, hỗ trợ gửi và nhận tin nhắn văn bản tức thì giữa khách hàng và tài xế trong suốt hành trình.

### 4.8. Đánh giá Chất lượng & Điểm Uy tín (Rating Thực tế)
- Sau khi chuyến đi hoàn thành (`COMPLETED`), khách hàng thực hiện chấm điểm đánh giá từ 1 đến 5 sao kèm nhận xét nhanh.
- **Nguyên tắc Tính Rating Trung bình Thực tế (`ReviewService.java`):**
  Nhằm bảo đảm tính minh bạch, công bằng và phản ánh đúng chất lượng phục vụ thực tế của từng tài xế (đồng thời là căn cứ trực tiếp để tính toán tỷ lệ hoa hồng cá nhân hóa), hệ thống tính điểm Rating trung bình dựa trên giá trị số học thực tế (Arithmetic Mean) từ toàn bộ các lượt đánh giá hợp lệ của khách hàng:
  $$\text{Rating} = \frac{\sum_{i=1}^{N} \text{Stars}_i}{N} \quad (\text{Làm tròn 1 chữ số thập phân})$$
  - Nếu tài xế chưa có lượt đánh giá nào ($N = 0$), điểm số mặc định ban đầu là $5.0$.
  - *(Hệ thống loại bỏ hoàn toàn các công thức làm mịn Bayesian ảo làm sai lệch điểm số thực tế của tài xế).*
- Giá trị Rating thực tế sau khi tính toán được phát qua sự kiện Kafka `DriverRatingUpdatedEvent` và cập nhật trực tiếp vào trường `driverRating` của `DriverProfile` trong `identity-service`, làm căn cứ điều chỉnh tỷ lệ hoa hồng cá nhân hóa.

---

# 5. ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ: TÀI XẾ (DRIVER)

### 5.1. Đăng ký Hồ sơ Tài xế & eKYC Sinh trắc học (FaceNet + Anti-Spoofing)
- **Tải lên giấy tờ:** Chụp ảnh hai mặt Căn cước công dân (CCCD) và Giấy phép lái xe (GPLX).
- **Chụp ảnh Selfie eKYC:**
  1. Module AI (`ai-service` chạy FastAPI) thực hiện kiểm tra thực thể sống **Liveness Detection (Anti-Spoofing)** qua mạng nơ-ron MiniFASNet để ngăn chặn hành vi giả mạo bằng ảnh in, video phát lại hoặc mặt nạ silicon.
  2. Trích xuất vector đặc trưng khuôn mặt 512 chiều thông qua mô hình FaceNet (InceptionResnetV1).
  3. So khớp khuôn mặt giữa ảnh chân dung selfie và ảnh chụp trên thẻ CCCD.
  4. Yêu cầu độ tương đồng Cosine Similarity $\ge 0.65$ mới cho phép nộp hồ sơ chờ Admin phê duyệt.

### 5.2. Đăng ký Phương tiện, Kiểm định Xe & Quan hệ Ràng buộc với Hồ sơ Tài xế
- **Thông tin phương tiện:** Biển số xe, Hãng sản xuất, Mẫu xe, Màu sắc, Năm sản xuất và Số chỗ ngồi đăng ký (`seatCapacity`).
- **Giấy tờ tải lên:** Ảnh thực tế xe, Giấy đăng ký xe (Cavet) hai mặt, Giấy chứng nhận bảo hiểm bắt buộc TNDS còn hạn.
- **Mối quan hệ phụ thuộc giữa Duyệt Tài xế và Duyệt Xe:**
  1. **Tài xế là điều kiện tiên quyết (Prerequisite):** Tài xế bắt buộc phải được Admin phê duyệt hồ sơ cá nhân trước (`DriverStatus.APPROVED`). Nếu tài xế chưa được duyệt (`PENDING` hoặc `REJECTED`), hệ thống chặn không cho phép nộp đăng ký xe hoặc phê duyệt xe (`ErrorCode.DRIVER_NOT_APPROVED`).
  2. **Tiến trình phê duyệt độc lập tại Admin:** Admin thẩm định hai thực thể qua 2 API riêng biệt:
     - Duyệt hồ sơ tài xế (`POST /drivers/{id}/approve`): Cập nhật `driverProfile.status = APPROVED`. Lúc này xe đi kèm vẫn chưa được duyệt (`isVerified = false, isActive = false`).
     - Duyệt phương tiện (`POST /vehicles/{id}/approve`): Cập nhật `vehicle.isVerified = true` và `vehicle.isActive = true`.
  3. **Quy tắc Kích hoạt Vận hành (Chỉ duyệt 1 trong 2 có Active không?):**
     - **TUYỆT ĐỐI KHÔNG!** Chỉ duyệt 1 trong 2 thì tài xế **KHÔNG THỂ HOẠT ĐỘNG TẠO CHUYẾN**.
     - Khi tài xế tạo chuyến xe (`TripService.createTrip`), hệ thống kiểm tra bắt buộc:
       `if (driver == null || !Boolean.TRUE.equals(driver.getIsVehicleVerified()) || !Boolean.TRUE.equals(driver.getIsVehicleActive()))`
       $\rightarrow$ Ném ngoại lệ `ErrorCode.VEHICLE_NOT_VERIFIED`.
     - Vì vậy, tài xế chỉ được xem là "Active toàn diện" và được phép đăng chuyến mở bán khi và chỉ khi **CẢ HAI ĐỀU ĐÃ ĐƯỢC DUYỆT HỢP LỆ** (`driverProfile.status == APPROVED` VÀ `vehicle.isVerified == true && vehicle.isActive == true`).

### 5.3. Khai báo Tỉnh thành Hoạt động (`operatingProvinces`)
- Tài xế được đăng ký tối đa 5 Tỉnh/Thành phố thuộc khu vực chạy xe ghép thường xuyên của mình.
- Hệ thống căn cứ vào danh sách này để phát tín hiệu thông báo đẩy (Smart Push) ngay khi có khách hàng đăng nhu cầu tìm xe đúng tuyến trên Sàn Chợ.

### 5.4. Tạo Chuyến xe (`Trip`) & Kiểm soát Khung cước Trần/Sàn theo Km
- Khai báo lộ trình: Tỉnh/Xã điểm xuất phát, Tỉnh/Xã điểm đến, các điểm đón/trả dọc đường (`TripStop`), giờ khởi hành, giờ đến dự kiến, số ghế mở bán và giá vé trên mỗi ghế (`priceVnd`).
- **Điều kiện tạo chuyến:**
  1. Hồ sơ tài xế và phương tiện đã được Admin phê duyệt hợp lệ.
  2. Số ghế mở bán không được vượt quá số ghế đăng kiểm của xe (`seatTotal <= seatCapacity`).
  3. Dư nợ tiền mặt hoa hồng sàn của tài xế phải nhỏ hơn hạn mức nợ cho phép ($systemDebt < CREDIT\_LIMIT$).
  4. Điểm uy tín của tài xế phải đạt ngưỡng tối thiểu ($ReputationScore \ge MIN\_ACCEPT\_SCORE$).
- **Kiểm soát Khung giá cước Trần/Sàn theo Km (`FareBoundaryService`):**
  Nhằm chống phá giá hoặc nâng giá bất hợp lý, hệ thống tự động kiểm tra giá vé theo công thức:
  $$\text{DistanceKm} = \text{Haversine}(\text{StartProvince}, \text{EndProvince}) \times \text{roadFactor}$$
  $$\text{minPrice} = \text{DistanceKm} \times \text{minPricePerKm}$$
  $$\text{maxPrice} = \text{DistanceKm} \times \text{maxPricePerKm}$$
  *(Mặc định: $minPricePerKm = 1.200$ đ, $maxPricePerKm = 4.000$ đ, $roadFactor = 1.30$).*  
  Nếu giá vé tài xế nhập nằm ngoài khoảng $[minPrice, maxPrice]$, hệ thống sẽ ném lỗi `FARE_OUT_OF_RANGE` và từ chối tạo chuyến.

### 5.5. Hàng đợi Duyệt Khách ghép & Duyệt Đổi lộ trình
- Khi có khách đặt vé, tài xế nhận thông báo khẩn cấp kèm thông tin phường/xã và địa chỉ đón/trả chi tiết của khách.
- Tài xế có quyền bấm **Duyệt (`APPROVE`)** hoặc **Từ chối (`REJECT`)** trong thời hạn SLA cấu hình (mặc định 120 phút).
- Khi tài xế bấm Duyệt: Hệ thống chính thức trừ ghế trống trên chuyến xe bằng Optimistic Locking và chốt vé.
- Khi nhận yêu cầu đổi lộ trình từ khách hàng: Tài xế xem giao diện so sánh điểm đón cũ và mới để duyệt hoặc từ chối trong thời hạn SLA 15 phút.

### 5.6. Khai thác Sàn Chợ & Gửi Lời mời Ghép khách
- Tài xế có thể xem danh sách các yêu cầu tìm xe đang mở (`OPEN`) trên Sàn Chợ Nhu Cầu.
- Tài xế có thể gửi lời mời ghép xe (`TripRequestInvitation`) vào chuyến xe còn ghế trống của mình, kèm theo giá vé đề xuất và giờ đón dự kiến.

### 5.7. Vận hành Hành trình (Bắt đầu, Hoàn thành, Hủy chuyến & Vòng đời Tự động)
1. **Bắt đầu hành trình (`STARTED`):**
   - Tài xế bấm bắt đầu chuyến khi xuất phát đón khách.
   - **Ràng buộc:** Chuyến xe phải có ít nhất 1 khách đặt vé thành công ($seatAvailable < seatTotal$). Tuyệt đối cấm chạy xe rỗng không có hành khách (`CANNOT_START_WITHOUT_PASSENGERS`).
2. **Hoàn thành hành trình (`COMPLETED`):**
   - Sau khi trả toàn bộ hành khách an toàn, tài xế bấm xác nhận hoàn tất chuyến.
   - Hệ thống phát sự kiện Kafka `TripCompletedEvent`, kích hoạt giải ngân Payout cho từng vé và cấn trừ nợ ví tự động.
3. **Hủy chuyến (`CANCELED`):**
   - Tài xế chỉ được phép hủy chuyến khi xe chưa khởi hành (trạng thái `OPEN` hoặc `FULL`). Tuyệt đối cấm hủy chuyến khi xe đang chạy (`STARTED`) hoặc đã xong (`COMPLETED`).
   - Khi hủy chuyến, tài xế bắt buộc nhập lý do. Hệ thống phát sự kiện Kafka `TripCancelledEvent`, tự động chuyển toàn bộ vé của khách sang `CANCELLED_DRIVER`, hoàn tiền 100% cho khách và áp dụng chế tài trừ điểm uy tín tài xế.
4. **Vòng đời Tự động (Tự động Hủy & Tự động Hoàn thành qua `TripLifecycleScheduler`):**
   - **Tự động Hủy sau 1 giờ:** Nếu quá 1 tiếng sau giờ khởi hành mà chuyến vẫn ở trạng thái `OPEN`/`FULL` (tài xế quên hoặc cố tình không bấm Bắt đầu), scheduler ngầm tự động chuyển trạng thái sang `CANCELED`, lý do: *"Tự động hủy chuyến: Quá 1 tiếng sau giờ khởi hành mà tài xế không bắt đầu chuyến"*, đồng thời kích hoạt hoàn tiền tự động cho toàn bộ hành khách.
   - **Tự động Hoàn tất sau 30 phút:** Nếu quá 30 phút sau thời gian đến dự kiến (`estimatedArrivalTime`) mà tài xế quên không bấm Hoàn tất, scheduler ngầm tự động chuyển trạng thái sang `COMPLETED` và kích hoạt luồng chia tiền, quyết toán nợ ví.

### 5.8. Quản trị Tài chính: Ví công nợ hoa hồng, Hạn mức nợ & Stripe Connect
- **Cơ chế Hạn mức Nợ ($systemDebt \ge CREDIT\_LIMIT$):**
  Nền tảng ghi nhận nợ hoa hồng từ các cuốc khách thanh toán tiền mặt. Khi tổng dư nợ tích lũy chạm ngưỡng hạn mức nợ (mặc định 500.000 VNĐ), hệ thống tự động khóa quyền tạo chuyến mới và khóa quyền duyệt các đơn vé tiền mặt.
- **Hai luồng xóa nợ tự động:**
  1. *Nạp tiền trả nợ trực tiếp:* Tài xế nạp tiền thanh toán nợ sàn qua cổng thanh toán Stripe PaymentSheet.
  2. *Chạy cuốc khách trả Thẻ Stripe:* Toàn bộ hoặc một phần thu nhập từ các cuốc khách trả thẻ sẽ được tự động cấn trừ vào dư nợ cũ cho đến khi hết nợ.
- **Stripe Connect Express Onboarding:** Tài xế thực hiện liên kết tài khoản ngân hàng cá nhân thông qua Stripe Express. Tiền thu nhập sau khi trừ hoa hồng và cấn trừ nợ sẽ được Stripe chuyển trực tiếp về tài khoản ngân hàng của tài xế.

---

# 6. ĐẶC TẢ NGHIỆP VỤ PHÂN HỆ: QUẢN TRỊ VIÊN (ADMIN)

### 6.1. Thẩm định & Duyệt Hồ sơ Tài xế
- Xem danh sách hồ sơ đăng ký tài xế ở trạng thái `PENDING`.
- Đối chiếu hình ảnh giấy tờ (CCCD, GPLX), kiểm tra kết quả so khớp khuôn mặt selfie và chỉ số tin cậy do mô hình AI cung cấp để ra quyết định Phê duyệt (`APPROVED`) hoặc Từ chối (`REJECTED`) kèm lý do cụ thể.

### 6.2. Thẩm định & Duyệt Phương tiện
- Thẩm định biển số, hãng xe, số ghế đăng kiểm, ảnh chụp thực tế xe, giấy đăng ký xe (Cavet) và hạn bảo hiểm bắt buộc.
- Phê duyệt xe hợp lệ vào hoạt động hoặc khóa phương tiện nếu có vi phạm.

### 6.3. Cấu hình Tham số Hoa hồng Động theo Rating & Điểm Uy tín
- Quản trị viên cấu hình động các mốc hoa hồng: Tỷ lệ cơ sở $R_{base}$, Tỷ lệ sàn $R_{min}$, Tỷ lệ trần $R_{max}$, mốc chuẩn Rating, bước nhảy Rating, mốc chuẩn Điểm uy tín, bước nhảy Điểm uy tín và Hạn mức nợ tối đa $CREDIT\_LIMIT$.
- Có công cụ trực quan (Simulator) để kiểm tra thử nghiệm công thức hoa hồng trước khi áp dụng toàn hệ thống.

### 6.4. Báo cáo Thống kê Doanh thu & Quản trị Công nợ Toàn hệ thống
- Dashboard tài chính cung cấp 4 chỉ số KPI then chốt:
  1. **Tổng GMV:** Tổng giá trị giao dịch của toàn bộ các cuốc xe đã hoàn thành trên nền tảng.
  2. **Doanh thu Sàn Thực thu:** Tổng số tiền hoa hồng nền tảng đã thu thành công (từ Stripe và nộp nợ).
  3. **Tổng Nợ Đang Treo:** Tổng dư nợ hoa hồng tiền mặt của tất cả các tài xế chưa thanh toán.
  4. **Tổng Nợ Đã Cấn Trừ:** Tổng giá trị công nợ đã được thu hồi tự động thông qua các cuốc xe Stripe.

### 6.5. Cấu hình Động Thời gian Timeout Vận hành (SLA)
- Quản trị viên có thể điều chỉnh linh hoạt mọi mốc thời gian timeout: Thời hạn tài xế duyệt vé, thời hạn thanh toán Stripe, thời hạn duyệt sửa đổi lộ trình, thời gian tồn tại yêu cầu chợ nhu cầu, và mốc giờ cutoff chặn hủy vé.

### 6.6. Cấu hình Động Khung cước Trần/Sàn theo Km (`FareBoundaryConfig`)
- Thiết lập đơn giá sàn (`minPricePerKm`), đơn giá trần (`maxPricePerKm`) trên mỗi km cho mỗi ghế ngồi, cùng hệ số đường bộ (`roadFactor`).
- Cho phép bật/tắt cơ chế kiểm tra giá cước linh hoạt (ví dụ: tạm tắt trong dịp cao điểm Tết nếu cần).

### 6.7. Trung tâm Phát sóng Thông báo Thủ công Đa kênh (Push Broadcast)
- Soạn thảo và phát sóng thông báo khẩn cấp tới người dùng theo phân khúc: Vai trò (Khách hàng / Tài xế), Tỉnh thành hoạt động, hoặc theo dải Điểm uy tín qua 3 kênh truyền dẫn: FCM Push Bar, Hộp thư In-App Inbox, và WebSocket Popup.

---

# 7. MÔ HÌNH DÒNG TIỀN VÀ THUẬT TOÁN TÀI CHÍNH (FINTECH ENGINE)

### 7.1. Kiến trúc C2C Direct Payment + B2B Platform Debt
- **Cuốc Tiền mặt (CASH):** Khách hàng trả tiền mặt trực tiếp 100% cho tài xế khi đi xe (giao dịch C2C). Nền tảng không can thiệp giữ tiền mặt, chỉ tính toán số tiền hoa hồng tương ứng và ghi nhận vào công nợ của tài xế (`systemDebt = systemDebt + commissionAmount`).
- **Cuốc Thẻ trực tuyến (STRIPE):** Toàn bộ tiền vé của khách hàng được tạm giữ (Pre-Authorization / Hold) an toàn tại cổng Stripe. Khi chuyến xe hoàn thành, hệ thống tự động thu tiền (`capture`) và thực hiện phân chia chi trả (Split Payout) về tài khoản ngân hàng của tài xế sau khi đã tự động cấn trừ hoa hồng sàn và các khoản nợ tiền mặt cũ.

---

### 7.2. Cơ chế Stripe Pre-Authorization (`HOLDING`), Capture (`PAID`) & Split Payouts
- **Hạch toán độc lập theo từng Booking:** Ngay khi chuyến xe kết thúc hoặc vé xe hoàn thành, hệ thống hạch toán dòng tiền cho từng vé xe:
$$\text{commissionAmount} = \text{totalFare} \times R_{final}$$
$$\text{netDriverIncome} = \text{totalFare} - \text{commissionAmount}$$

---

### 7.3. Thuật toán Cấn trừ nợ Tiền mặt tự động (Auto Debt Offset - 3 Kịch bản)

Khi cuốc xe thanh toán bằng Thẻ Stripe hoàn tất, hệ thống kích hoạt thuật toán cấn trừ nợ ví tự động:

```
                  ┌──────────────────────────────────────────┐
                  │    Booking STRIPE hoàn tất (COMPLETED)   │
                  │   netDriverIncome = totalFare - hoa hồng │
                  │     debtBefore = Dư nợ tiền mặt hiện tại │
                  └─────────────────────┬────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│     KỊCH BẢN 1       │     │     KỊCH BẢN 2       │     │     KỊCH BẢN 3       │
│  Tài xế không nợ     │     │ Nợ < Thu nhập cuốc xe│     │ Nợ >= Thu nhập cuốc  │
│  (debtBefore <= 0)   │     │ (0 < debt < income)  │     │ (debt >= income)     │
├──────────────────────┤     ├──────────────────────┤     ├──────────────────────┤
│ debtDeducted = 0đ    │     │ debtDeducted = debt  │     │ debtDeducted = income│
│ finalPayout = income │     │ finalPayout =        │     │ finalPayout = 0đ     │
│ newDebt = 0đ         │     │   income - debt > 0  │     │ newDebt = debt-income│
├──────────────────────┤     ├──────────────────────┤     ├──────────────────────┤
│ Gọi Stripe Transfer  │     │ Gọi Stripe Transfer  │     │ KHÔNG GỌI TRANSFER   │
│ chuyển 100% thu nhập │     │ chuyển phần dư cho tx│     │ (Tránh lỗi Stripe<=0)│
│ PayoutStatus:        │     │ Xóa sạch nợ về 0đ    │     │ Cấn trừ 100% vào nợ  │
│     COMPLETED        │     │ PayoutStatus:        │     │ PayoutStatus:        │
│                      │     │     COMPLETED        │     │   FULL_DEBT_OFFSET   │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

- **Ràng buộc Kỹ thuật Stripe:** Stripe API tuyệt đối cấm thực hiện `Transfer.create()` với số tiền $\le 0$. Vì vậy, ở **Kịch bản 3**, hệ thống ghi nhận trạng thái giao dịch là `FULL_DEBT_OFFSET`, đặt `stripe_transfer_id = "N/A_FULL_OFFSET"`, `finalPayoutAmount = 0` mà **tuyệt đối không gọi Stripe Transfer API**.

---

### 7.4. Công thức Tính Hoa hồng Cá nhân hóa ($R_{final}$) theo Rating Thực tế

Tỷ lệ hoa hồng áp dụng cho mỗi tài xế được tính toán cá nhân hóa theo công thức sau:

$$\Delta Rating = (\text{Rating} - 4.5) \times 2.0\%$$
$$\Delta Rep = \frac{\text{ReputationScore} - 80}{10} \times 1.0\%$$
$$R_{applied} = R_{base} - \Delta Rating - \Delta Rep$$
$$R_{final} = \max\Big(R_{min}, \min\big(R_{max}, R_{applied}\big)\Big)$$

Trong đó:
- $\text{Rating}$: Điểm đánh giá trung bình thực tế từ các đánh giá của khách hàng ($\text{mặc định} = 5.0$).
- $\text{ReputationScore}$: Điểm uy tín tích lũy của tài xế ($\text{mặc định} = 80$, tối đa 100).
- $R_{base}$: Tỷ lệ hoa hồng cơ sở (mặc định $18.0\%$).
- $R_{min}$: Tỷ lệ hoa hồng sàn tối thiểu (mặc định $12.0\%$).
- $R_{max}$: Tỷ lệ hoa hồng trần tối đa (mặc định $25.0\%$).

---

# 8. CHUYÊN ĐỀ SÂU: MA TRẬN CHUYỂN TRẠNG THÁI VÀ XỬ LÝ TOÀN DIỆN CÁC EDGE CASES

> [!CAUTION]
> Phần này đặc tả chi tiết toàn bộ các trạng thái trong mã nguồn (Enum), điều kiện kích hoạt, chuyển tiếp hợp lệ và các kịch bản ngoại lệ (Edge Cases) phức tạp trong môi trường phân tán.

### 8.1. Ma trận Chuyển trạng thái Đặt vé (`BookingStatus`) & Xử lý Edge Cases

Enum trong mã nguồn: `com.rideUp.booking_service.enums.BookingStatus`
- `PENDING_PAYMENT`: Vừa tạo đơn vé thẻ Stripe nhưng chưa có thông tin xác thực thẻ (luồng fallback).
- `WAITING_DRIVER_APPROVAL`: Đơn chọn Tiền mặt hoặc đã ủy quyền giữ tiền Thẻ Stripe (`HOLDING`), đang chờ tài xế duyệt đón.
- `CONFIRMED`: Tài xế đã duyệt đón (hoặc vé tạo từ lời mời trên Chợ), chỗ ngồi đã chốt chính thức.
- `REJECTED_BY_DRIVER`: Tài xế từ chối đón khách kèm lý do.
- `EXPIRED`: Hết thời hạn duyệt vé hoặc quá hạn thanh toán.
- `CANCELLED_USER`: Khách hàng chủ động hủy vé hợp lệ trước giờ xuất phát.
- `CANCELLED_DRIVER`: Toàn bộ chuyến xe bị tài xế hủy.
- `CANCELLED_PAYMENT_FAILED`: Hủy do thanh toán thất bại.
- `COMPLETED`: Cuốc xe hoàn thành an toàn, đã hạch toán tài chính.

#### Bảng Ma trận Chuyển đổi Trạng thái Đặt vé:

| Trạng thái Hiện tại | Trạng thái Đích Đến | Tác nhân Kích hoạt | Điều kiện & Hành động Hệ thống |
| :--- | :--- | :--- | :--- |
| *(Khởi tạo)* | `WAITING_DRIVER_APPROVAL` | Khách tạo booking | Khách chọn Tiền mặt (`CASH`) hoặc đã xác thực giữ tiền Thẻ Stripe (`isStripePrePaid = true`). Đặt `paymentStatus = HOLDING` (với Stripe) hoặc `PENDING` (với Tiền mặt). Đặt `expiresAt = min(now + SLA_DRIVER_APPROVAL (120 phút), departureTime - 1h)`. |
| *(Khởi tạo)* | `CONFIRMED` | Khách chấp nhận lời mời | Đơn vé được tạo từ lời mời trên Sàn Chợ (`isFromInvitation = true`). Do tài xế đã chủ động mời từ trước, đơn vé vào thẳng `CONFIRMED` và trừ ghế trực tiếp trên `trip-service`. |
| *(Khởi tạo)* | `PENDING_PAYMENT` | Khách tạo booking | Chọn Thẻ Stripe nhưng chưa pre-auth thẻ (fallback). Đặt `expiresAt = min(now + SLA_PAYMENT (60 phút), departureTime - 1h)`. |
| `WAITING_DRIVER_APPROVAL` | `CONFIRMED` | Tài xế bấm Duyệt (`APPROVE`) | Kiểm tra nợ và uy tín tài xế hợp lệ. **Chính thức trừ ghế trên chuyến xe bằng Optimistic Locking**. Bắn sự kiện Kafka `booking-confirmed`. |
| `WAITING_DRIVER_APPROVAL` | `REJECTED_BY_DRIVER` | Tài xế bấm Từ chối (`REJECT`) | Tài xế từ chối đón. Bắn Kafka `BookingRejectedEvent`. Nếu là vé Stripe, tự động giải phóng khoản tiền đang hold (`VOIDED`). **Lưu ý: Đơn chờ duyệt chưa từng trừ ghế nên không cần release ghế**. |
| `WAITING_DRIVER_APPROVAL` | `EXPIRED` | Scheduler quét ngầm (`BookingExpireScheduler`) | Quá hạn `expiresAt` mà tài xế không phản hồi. Tự động chuyển `EXPIRED`, giải phóng hold tiền thẻ. Không cần release ghế. |
| `WAITING_DRIVER_APPROVAL` | `CANCELLED_USER` | Khách bấm Hủy | Khách đổi ý khi tài xế chưa duyệt. Hủy đơn an toàn, giải phóng hold tiền thẻ Stripe. |
| `PENDING_PAYMENT` | `WAITING_DRIVER_APPROVAL` | Stripe Webhook / API | Khách hoàn tất giữ tiền thẻ thành công $\rightarrow$ chuyển sang hàng đợi chờ tài xế duyệt. |
| `PENDING_PAYMENT` | `CANCELLED_PAYMENT_FAILED` | Stripe Webhook / Lỗi | Khách thẻ bị từ chối hoặc giao dịch thất bại. |
| `PENDING_PAYMENT` | `EXPIRED` | Scheduler quét ngầm | Hết hạn chờ thanh toán mà khách không thanh toán thẻ. |
| `CONFIRMED` | `CANCELLED_USER` | Khách bấm Hủy | Khách hủy trước giờ xuất phát $\ge CUSTOMER\_CANCEL\_CUTOFF$ (mặc định 2 tiếng). **Bắn Kafka release ghế** và tự động hoàn tiền thẻ Stripe. |
| `CONFIRMED` | `CANCELLED_DRIVER` | Kafka Consumer | Tài xế hủy chuyến xe $\rightarrow$ Tự động chuyển tất cả vé `CONFIRMED` sang `CANCELLED_DRIVER`, tự động hoàn tiền 100% cho khách. |
| `CONFIRMED` | `COMPLETED` | Tài xế / Trip Service | Chuyến xe hoàn thành $\rightarrow$ Bắn Kafka `TripCompletedEvent`, kích hoạt thu tiền thẻ (`capture`), chia tiền Payout và cấn trừ nợ ví. |

#### Xử lý các Edge Cases Đặt vé:
1. **Edge Case: Hai khách cùng bấm đặt ghế cuối cùng cùng một tích tắc (Race Condition):**
   - *Xử lý:* CSDL sử dụng JPA Optimistic Locking (`@Version` trên Entity `Trip`). Khi tài xế duyệt đơn hoặc khách nhận lời mời, thao tác trừ ghế kích hoạt kiểm tra version. Giao dịch commit trước sẽ thành công; giao dịch sau bị xung đột phiên bản, hệ thống thử lại tối đa 3 lần. Nếu ghế đã hết thực sự, ném ngoại lệ `SEAT_NOT_AVAILABLE`, rollback an toàn.
2. **Edge Case: Khách bấm đặt vé nhưng mạng chập chờn bấm liên tiếp nhiều lần:**
   - *Xử lý:* Header API yêu cầu `Idempotency-Key`. Hệ thống kiểm tra Redis Key `idempotency:booking:{key}`. Các request trùng lặp trong vòng 120 giây sẽ bị chặn và trả về kết quả của request đầu tiên.
3. **Edge Case: Khách cố tình gọi API hủy vé khi còn 30 phút nữa là xe chạy:**
   - *Xử lý:* Backend kiểm tra: $now > departureTime - CUSTOMER\_CANCEL\_CUTOFF$ $\rightarrow$ Ném ngoại lệ `ErrorCode.CANCELLATION_CUTOFF_EXCEEDED`, từ chối hủy vé.
4. **Edge Case: Đơn đang ở `WAITING_DRIVER_APPROVAL` thì chuyến xe bị hủy:**
   - *Xử lý:* Khi tài xế hủy chuyến, `trip-service` phát sự kiện `TripCancelledEvent`. `booking-service` tiêu thụ sự kiện này, quét toàn bộ vé thuộc chuyến ở cả trạng thái `CONFIRMED` lẫn `WAITING_DRIVER_APPROVAL` để chuyển sang `CANCELLED_DRIVER` và giải phóng tiền cọc an toàn.

---

### 8.2. Ma trận Chuyển trạng thái Chuyến xe (`TripStatus`) & Xử lý Edge Cases

Enum trong mã nguồn: `com.rideup.trip_service.enums.TripStatus`
- `OPEN`: Chuyến xe đang mở nhận khách, còn ghế trống.
- `FULL`: Chuyến xe đã được đặt hết toàn bộ số ghế khả dụng.
- `STARTED`: Tài xế đã xuất phát bắt đầu hành trình.
- `COMPLETED`: Toàn bộ hành khách đã được trả an toàn, kết thúc chuyến.
- `CANCELED`: Chuyến đi bị hủy (do tài xế hoặc do hệ thống tự động hủy).

#### Bảng Ma trận Chuyển đổi Trạng thái Chuyến xe:

| Trạng thái Hiện tại | Trạng thái Đích Đến | Tác nhân Kích hoạt | Điều kiện & Hành động Hệ thống |
| :--- | :--- | :--- | :--- |
| *(Khởi tạo)* | `OPEN` | Tài xế tạo chuyến | Kiểm tra hồ sơ tài xế & xe hợp lệ, giá vé đúng khung km, nợ $< CREDIT\_LIMIT$, uy tín $\ge MIN\_ACCEPT\_SCORE$. Ghế trống = Tổng ghế. |
| `OPEN` | `FULL` | Hệ thống trừ ghế | Khi số ghế khả dụng giảm về đúng bằng 0 (`seatAvailable == 0`). |
| `FULL` | `OPEN` | Hệ thống nhả ghế | Khi có khách hủy vé hợp lệ làm $seatAvailable > 0$. |
| `OPEN` hoặc `FULL` | `STARTED` | Tài xế bấm Bắt đầu | **Điều kiện bắt buộc:** Chuyến xe phải có ít nhất 1 khách đặt vé ($seatAvailable < seatTotal$). Tuyệt đối cấm chạy xe rỗng (`CANNOT_START_WITHOUT_PASSENGERS`). |
| `STARTED` | `COMPLETED` | Tài xế bấm Hoàn tất | Bắn Kafka `TripCompletedEvent` kích hoạt Payout giải ngân dòng tiền cho từng vé. |
| `OPEN` hoặc `FULL` | `CANCELED` | Tài xế bấm Hủy chuyến | Nhập lý do hủy. Bắn Kafka `TripCancelledEvent` để hủy toàn bộ vé của khách và hoàn tiền tự động. |
| `OPEN` hoặc `FULL` | `CANCELED` | `TripLifecycleScheduler` | **Tự động hủy chuyến:** Quá 1 giờ sau giờ xuất phát (`departureTime <= now - 1h`) mà tài xế không bấm Bắt đầu. Tự động hủy chuyến, hoàn tiền cho khách. |
| `STARTED` | `COMPLETED` | `TripLifecycleScheduler` | **Tự động hoàn thành chuyến:** Quá 30 phút sau giờ đến dự kiến (`estimatedArrivalTime <= now - 30m`) mà tài xế không bấm Hoàn tất. Tự động hoàn thành và quyết toán dòng tiền. |

#### Xử lý các Edge Cases Chuyến xe:
1. **Edge Case: Tài xế muốn hủy chuyến khi xe đang chạy dở (`STARTED`):**
   - *Xử lý:* Nếu $status == STARTED$ hoặc $status == COMPLETED$ mà gọi hủy chuyến $\rightarrow$ Ném ngoại lệ `ErrorCode.CANNOT_CANCEL_STARTED_TRIP`. Tài xế bắt buộc phải hoàn tất chuyến xe hoặc liên hệ CSKH.
2. **Edge Case: Chuyến xe không có ai đặt vé nhưng tài xế bấm "Bắt đầu chuyến":**
   - *Xử lý:* Nếu $seatAvailable == seatTotal$ $\rightarrow$ Ném lỗi `ErrorCode.CANNOT_START_WITHOUT_PASSENGERS`, ngăn chặn tạo chuyến ảo.

---

### 8.3. Ma trận Chuyển trạng thái Chợ Nhu Cầu (`TripRequest` & `Invitation`)

Enum trong mã nguồn:
- `TripRequestStatus`: `OPEN`, `ACCEPTED`, `EXPIRED`, `CANCELLED`
- `InvitationStatus`: `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`

#### Luồng Tương tác & Chuyển đổi Trạng thái Kép:

```
[Khách đăng nhu cầu] ────────► TripRequest: OPEN
                                     │
      ┌──────────────────────────────┴──────────────────────────────┐
      │ (Tài xế gửi lời mời)                                        │ (Quá hạn 24h / Scheduler quét)
      ▼                                                             ▼
Invitation: PENDING                                         TripRequest: EXPIRED
      │                                                             │
      ├────────────────────────┬────────────────────────┐           └─► (Đổi các Invitation PENDING
      │ Khách BẤM CHẤP NHẬN    │ Khách TỪ CHỐI          │                 sang REJECTED tự động)
      ▼                        ▼                        ▼
Invitation: ACCEPTED     Invitation: REJECTED     Invitation: REJECTED
      │                        │
      ▼                        └─► (TripRequest vẫn OPEN chờ tài xế khác mời)
TripRequest: ACCEPTED
      │
      ├─► (Hệ thống TỰ ĐỘNG chuyển các lời mời PENDING khác của request này sang REJECTED)
      └─► (Tạo Booking CONFIRMED và trừ ghế chuyến xe nguyên tử)
```

#### Xử lý Edge Case:
- Khi một yêu cầu tìm xe hết hạn (`TripRequestExpireScheduler` quét ngầm mỗi phút), bản ghi `TripRequest` chuyển sang `EXPIRED`, toàn bộ các lời mời `PENDING` gắn với yêu cầu này được tự động cập nhật sang `REJECTED`, và hệ thống phát sự kiện Kafka `InvitationRejectedEvent` để tài xế nhận biết khách không còn nhu cầu.

---

### 8.4. Ma trận Chuyển trạng thái Yêu cầu Sửa vé (`BookingModification`)

Enum trong mã nguồn: `com.rideUp.booking_service.enums.ModificationStatus`
- `PENDING_DRIVER`: Khách đã gửi yêu cầu, đang chờ tài xế duyệt.
- `APPROVED`: Tài xế chấp thuận điểm đón/trả mới.
- `REJECTED`: Tài xế từ chối yêu cầu đổi điểm đón/trả.
- `EXPIRED`: Quá hạn SLA (15 phút) mà tài xế không phản hồi.

#### Bảng Chuyển đổi Trạng thái Sửa vé:

| Trạng thái Hiện tại | Trạng thái Đích Đến | Tác nhân Kích hoạt | Hành vi Chi tiết |
| :--- | :--- | :--- | :--- |
| *(Khởi tạo)* | `APPROVED` (Ghi đè ngay) | Khách gửi yêu cầu | Khi vé đang ở `WAITING_DRIVER_APPROVAL`. Ghi đè trực tiếp thông tin vào vé gốc mà không cần tạo hàng đợi duyệt. |
| *(Khởi tạo)* | `PENDING_DRIVER` | Khách gửi yêu cầu | Khi vé đã `CONFIRMED`. Đặt `expiresAt = min(now + 15p, departureTime - 30p)`. |
| `PENDING_DRIVER` | `APPROVED` | Tài xế bấm Chấp thuận | Ghi đè địa chỉ mới vào vé `Booking`, cập nhật `resolvedAt = now`. Bắn Kafka thông báo cho khách. |
| `PENDING_DRIVER` | `REJECTED` | Tài xế bấm Từ chối | Nhập lý do từ chối. Giữ nguyên thông tin vé gốc ban đầu. Bắn Kafka gửi lý do cho khách. |
| `PENDING_DRIVER` | `EXPIRED` | Scheduler quét ngầm | Quá hạn 15 phút. Tự động chuyển `EXPIRED`, giữ nguyên thông tin vé gốc ban đầu. |

---

### 8.5. Ma trận Chuyển trạng thái Payout Ví Tài xế (`PayoutStatus`)

Enum trong mã nguồn: `com.rideUp.payment_service.enums.PayoutStatus`
Bảng CSDL: `driver_payout_transaction`

| Trạng thái (`PayoutStatus`) | Ý nghĩa Nghiệp vụ | Kịch bản Kích hoạt & Hành vi Hệ thống |
| :--- | :--- | :--- |
| `PENDING` | Khởi tạo phiên chuyển tiền | Hệ thống vừa nhận sự kiện hoàn thành chuyến xe, chuẩn bị tính toán dòng tiền. |
| `COMPLETED` | Đã chuyển tiền thành công | **Kịch bản 1 & 2:** Tài xế không nợ hoặc nợ nhỏ hơn thu nhập. Hệ thống gọi Stripe `Transfer.create` chuyển tiền thực nhận vào tài khoản Stripe Connect của tài xế. Lưu `stripeTransferId`. |
| `FULL_DEBT_OFFSET` | Cấn trừ 100% nợ cũ | **Kịch bản 3:** Dư nợ tiền mặt lớn hơn hoặc bằng thu nhập cuốc xe. Cấn trừ toàn bộ thu nhập vào nợ cũ. **Tuyệt đối không gọi Stripe Transfer** (tránh lỗi chuyển $\le 0$đ). Đặt `stripe_transfer_id = "N/A_FULL_OFFSET"`, $finalPayoutAmount = 0$. |
| `SKIPPED_NOT_ONBOARDED` | Bỏ qua do chưa liên kết Stripe | Tài xế chưa hoàn tất liên kết tài khoản Stripe Express (`stripePayoutsEnabled = false`). |
| `FAILED` | Thất bại do lỗi Stripe | Stripe API trả về lỗi hoặc tài khoản thụ hưởng của tài xế bị khóa. Ghi nhận `failureReason`. |

---

### 8.6. Ma trận Chuyển trạng thái Giao dịch Thanh toán (`PaymentStatus`)

Enum trong mã nguồn: `com.rideUp.payment_service.enums.PaymentStatus`
Bảng CSDL: `payments`

| Trạng thái (`PaymentStatus`) | Ý nghĩa Nghiệp vụ | Kịch bản Kích hoạt & Hành vi Chi tiết |
| :--- | :--- | :--- |
| `PENDING` | Chờ thanh toán | Đơn vé tiền mặt vừa tạo (chờ thanh toán trực tiếp cho tài xế trên xe) hoặc đơn thẻ Stripe gọi qua API thuần chưa xác thực ủy quyền thẻ (luồng dự phòng). |
| `HOLDING` | Tiền đang tạm giữ trên thẻ | Khách thanh toán Thẻ Stripe thành công qua PaymentSheet với `capture_method = MANUAL` (`isStripePrePaid = true`). Tiền bị đóng băng trên thẻ khách, nền tảng chưa thực thu. |
| `PAID` | Đã thu tiền thành công | Chuyến xe hoàn thành (`COMPLETED`). Hệ thống gọi `payoutService.processStripeBookingCompleted` để capture tiền thẻ khách vào tài khoản nền tảng. |
| `FAILED` | Giao dịch thất bại | Khách nhập sai thẻ, thẻ hết hạn, không đủ số dư hoặc lỗi kết nối cổng Stripe. |
| `REFUNDED` | Đã hoàn tiền cho khách *(Dead Runtime Path)* | Nhánh code phòng thủ trong `RefundService.java` (gọi `Stripe Refund.create` khi `payment.getStatus() == PAID`). Trong thực tế hoạt động, tiền chỉ chuyển `PAID` khi chuyến đi đã `COMPLETED`, mà chuyến đã hoàn thành thì backend chặn không cho hủy vé, và hệ thống chưa có màn hình Admin Refund sau chuyến, nên nhánh này không bao giờ được chạm tới trong luồng vận hành thực tế. |
| `VOIDED` | Đã hủy ủy quyền giữ tiền *(Luồng Hủy Thực tế)* | Đơn vé đang ở trạng thái tạm giữ tiền (`HOLDING`) nhưng bị tài xế từ chối (`REJECTED_BY_DRIVER`), hết hạn duyệt (`EXPIRED`) hoặc khách hủy hợp lệ trước giờ chạy $\rightarrow$ Hệ thống gọi `paymentIntent.cancel()` để hủy ủy quyền, giải phóng hạn mức trên thẻ khách ngay lập tức và hoàn toàn không mất phí giao dịch. **100% các ca hủy vé Stripe trên hệ thống đều đi vào trạng thái này**. |

---

### 8.7. Ma trận Chuyển trạng thái Hoàn tiền & Hủy ủy quyền (`RefundStatus`)

Enum trong mã nguồn: `com.rideUp.payment_service.enums.RefundStatus`
Bảng CSDL: `refunds`

| Trạng thái (`RefundStatus`) | Ý nghĩa Nghiệp vụ | Kịch bản Kích hoạt & Hành vi Chi tiết |
| :--- | :--- | :--- |
| `PENDING` | Đang xử lý hoàn tiền | Khởi tạo yêu cầu hoàn tiền hoặc hủy ủy quyền giữ tiền. |
| `SUCCESS` | Hoàn tiền/Hủy ủy quyền thành công | Stripe Refund trả về `status = "succeeded"`, hoặc hủy ủy quyền `HOLDING` thành công. Cập nhật `refundedAt = now`, bắn Kafka `publishRefundCompleted`. |
| `FAILED` | Hoàn tiền thất bại | Cổng Stripe từ chối hoặc lỗi mạng trong quá trình gọi hoàn tiền. Ghi nhận `failureReason`. |

---

### 8.8. Bản đồ Sự kiện Apache Kafka & Tính Idempotent chống trùng lặp

```
[booking-service] ──(booking-waiting-approval)──► [notification-service]
[booking-service] ──(booking-confirmed)───────────► [trip-service, notification-service]
[booking-service] ──(booking-cancelled)───────────► [trip-service, payment-service, notification-service]
[booking-service] ──(booking-rejected)────────────► [notification-service]
[booking-service] ──(booking-modification-req)────► [notification-service]
[booking-service] ──(booking-modification-resolved)► [notification-service]
[trip-service]    ──(trip-cancelled)──────────────► [booking-service, notification-service]
[trip-service]    ──(trip-completed)──────────────► [payment-service, notification-service]
[trip-service]    ──(trip-request-created)────────► [notification-service] (Smart Push theo tỉnh)
[trip-service]    ──(trip-request-invited)────────► [notification-service] (Push mời khách)
[trip-service]    ──(trip-request-expired)────────► [notification-service]
[payment-service] ──(payment-completed)───────────► [booking-service, notification-service]
[payment-service] ──(payment-failed)──────────────► [booking-service, notification-service]
[payment-service] ──(refund-completed)────────────► [booking-service, notification-service]
[payment-service] ──(driver-debt-offset)──────────► [identity-service] (Cập nhật dư nợ ví)
[review-service]  ──(driver-rating-updated)───────► [identity-service] (Cập nhật Rating thực tế)
[identity-service]──(system-config-changed)───────► [trip-service, payment-service]
```

- **Tính Idempotent Consumer:** Mọi Kafka Listener trong hệ thống đều thực hiện kiểm tra `eventId` hoặc kiểm tra trạng thái thực thể trong CSDL (ví dụ: `driverPayoutTransactionRepository.findByBookingId(bookingId)`) trước khi xử lý nghiệp vụ, bảo đảm an toàn tuyệt đối khi mạng chập chờn hoặc Kafka retry message.

---

### 8.9. Bảng Tổng hợp Kiểm định Trạng thái Enum Toàn Hệ thống (Audit Codebase)

Dưới đây là kết quả đối chiếu và kiểm định chi tiết giữa các giá trị Enum được khai báo trong mã nguồn Java và tình trạng sử dụng thực tế (Active vs Dead Code / Fallback):

| Tên Enum | Giá trị Enum | Hiện trạng Sử dụng Thực tế | Ghi chú Chi tiết từ Mã nguồn |
| :--- | :--- | :--- | :--- |
| **`BookingStatus`** | `WAITING_DRIVER_APPROVAL` | **Đang hoạt động (Active)** | Trạng thái mặc định cho mọi đơn vé tạo mới (Tiền mặt hoặc Stripe đã pre-auth). |
| | `CONFIRMED` | **Đang hoạt động (Active)** | Khi tài xế duyệt đơn hoặc khách nhận lời mời từ Sàn Chợ. |
| | `COMPLETED` | **Đang hoạt động (Active)** | Khi chuyến xe kết thúc thành công. |
| | `REJECTED_BY_DRIVER` | **Đang hoạt động (Active)** | Khi tài xế từ chối đón khách. |
| | `CANCELLED_USER` | **Đang hoạt động (Active)** | Khi khách hàng chủ động hủy vé hợp lệ trước giờ chạy. |
| | `CANCELLED_DRIVER` | **Đang hoạt động (Active)** | Khi chuyến xe bị tài xế hủy. |
| | `CANCELLED_PAYMENT_FAILED` | **Đang hoạt động (Active)** | Khi thanh toán Stripe capture thất bại. |
| | `EXPIRED` | **Đang hoạt động (Active)** | Do scheduler `BookingExpireScheduler` quét quá hạn duyệt hoặc thanh toán. |
| | `PENDING_PAYMENT` | **Dự phòng / Dead trên App** | Trên Mobile App, khách bắt buộc ủy quyền thẻ xong mới tạo vé (`isStripePrePaid = true`) nên không bao giờ rơi vào trạng thái này. Chỉ dùng làm fallback cho API thuần. |
| **`PaymentStatus`** | `PENDING` | **Đang hoạt động (Active)** | Gán cho đơn tiền mặt lúc tạo mới hoặc thẻ Stripe chưa ủy quyền. |
| | `HOLDING` | **Đang hoạt động (Active)** | Gán khi khách thanh toán Thẻ Stripe thành công qua PaymentSheet (`capture_method = MANUAL`). |
| | `PAID` | **Đang hoạt động (Active)** | Gán khi hoàn tất chuyến xe và Stripe capture thành công vào ví sàn. |
| | `FAILED` | **Đang hoạt động (Active)** | Gán khi thanh toán thẻ thất bại hoặc hết hạn. |
| | `VOIDED` | **Đang hoạt động (Active)** | **100% các ca hủy vé Stripe thực tế**: giải phóng ủy quyền giữ tiền trên thẻ của khách. |
| | `REFUNDED` | **Dead Runtime Path** | Nhánh code phòng thủ trong `RefundService.java`. Do cuốc đã `PAID` (`COMPLETED`) thì backend chặn không cho hủy vé và chưa có tính năng Admin Refund sau chuyến, nên không bao giờ chạm tới trong thực tế. |
| **`RefundStatus`** | `PENDING` | **Đang hoạt động (Active)** | Khởi tạo bản ghi refund trong CSDL. |
| | `SUCCESS` | **Đang hoạt động (Active)** | Hủy hold thành công (`VOIDED`) hoặc refund Stripe thành công. |
| | `FAILED` | **Đang hoạt động (Active)** | Lỗi kết nối hoặc Stripe từ chối thao tác. |
| **`PayoutStatus`** | `COMPLETED` | **Đang hoạt động (Active)** | Chuyển tiền thành công vào Stripe Connected Account của tài xế. |
| | `FULL_DEBT_OFFSET` | **Đang hoạt động (Active)** | Cấn trừ 100% thu nhập chuyến đi vào nợ sàn của tài xế, không gọi Stripe Transfer. |
| | `SKIPPED_NOT_ONBOARDED` | **Đang hoạt động (Active)** | Tài xế chưa liên kết Stripe Express (`stripePayoutsEnabled = false`), giữ tiền lại sàn. |
| | `FAILED` | **Đang hoạt động (Active)** | Gọi Stripe Transfer API thất bại. |
| | `PENDING` | **Dead Value** | Khai báo trong Enum nhưng không có bất kỳ dòng code nào gán giá trị này (bản ghi payout được tạo trực tiếp với trạng thái cuối). |
| **`TripStatus`** | `OPEN` | **Đang hoạt động (Active)** | Chuyến xe mới mở, còn ghế trống. |
| | `FULL` | **Đang hoạt động (Active)** | Chuyến xe đã hết ghế trống. |
| | `STARTED` | **Đang hoạt động (Active)** | Tài xế bắt đầu hành trình đón trả. |
| | `COMPLETED` | **Đang hoạt động (Active)** | Chuyến xe hoàn thành, kích hoạt chia tiền và cấn trừ nợ. |
| | `CANCELED` | **Đang hoạt động (Active)** | Tài xế hủy chuyến hoặc scheduler tự hủy do quá giờ không xuất phát. |
| **`TripRequestStatus`** | `OPEN` | **Đang hoạt động (Active)** | Khách đăng tìm xe trên Sàn Chợ. |
| | `ACCEPTED` | **Đang hoạt động (Active)** | Khách chấp thuận lời mời từ tài xế. |
| | `CANCELLED` | **Đang hoạt động (Active)** | Khách chủ động hủy yêu cầu tìm xe. |
| | `EXPIRED` | **Đang hoạt động (Active)** | Quá 24 giờ (`MARKETPLACE_REQUEST_TTL`) tự động hết hạn. |
| **`InvitationStatus`** | `PENDING` | **Đang hoạt động (Active)** | Lời mời đang chờ khách phản hồi. |
| | `ACCEPTED` | **Đang hoạt động (Active)** | Khách chấp thuận lời mời. |
| | `REJECTED` | **Đang hoạt động (Active)** | Khách từ chối lời mời hoặc bị hủy khi yêu cầu gốc hết hạn. |
| | `EXPIRED` | **Dead Value** | Khai báo trong Enum nhưng trong code `TripRequestExpireScheduler.java`, khi yêu cầu gốc hết hạn, hệ thống gán lời mời sang `REJECTED` thay vì `EXPIRED`. |
| **`ModificationStatus`** | `PENDING_DRIVER` | **Đang hoạt động (Active)** | Chờ tài xế phản hồi yêu cầu đổi lộ trình trên vé `CONFIRMED`. |
| | `APPROVED` | **Đang hoạt động (Active)** | Tài xế duyệt đổi lộ trình, hoặc tự động duyệt nếu vé đang ở `WAITING_DRIVER_APPROVAL`. |
| | `REJECTED` | **Đang hoạt động (Active)** | Tài xế từ chối thay đổi lộ trình. |
| | `EXPIRED` | **Đang hoạt động (Active)** | Quá 15 phút tài xế không phản hồi, scheduler tự hủy yêu cầu. |
| **`DriverStatus`** | `PENDING` | **Đang hoạt động (Active)** | Hồ sơ tài xế mới nộp, chờ Admin duyệt. |
| | `APPROVED` | **Đang hoạt động (Active)** | Admin đã phê duyệt hồ sơ cá nhân của tài xế. |
| | `REJECTED` | **Đang hoạt động (Active)** | Admin từ chối hồ sơ kèm lý do. |
| **`VehicleReviewStatus`** | `NOT_REGISTERED` | **Đang hoạt động (Active)** | Tài xế chưa đăng ký phương tiện. |
| | `PENDING` | **Đang hoạt động (Active)** | Phương tiện chờ Admin thẩm định Cavet/Bảo hiểm. |
| | `APPROVED` | **Đang hoạt động (Active)** | Phương tiện đã duyệt và kích hoạt (`isVerified = true, isActive = true`). |
| | `REJECTED` | **Đang hoạt động (Active)** | Phương tiện bị Admin từ chối. |
| | `EXPIRED_DOCUMENTS` | **Đang hoạt động (Active)** | Giấy đăng ký xe hoặc bảo hiểm TNDS hết hạn. |

---

# 9. HƯỚNG DẪN DÀNH CHO NGƯỜI MỚI (ONBOARDING GUIDE)

### Khởi động Hệ thống Hạ tầng & Dịch vụ
1. Đảm bảo Docker đang chạy: MySQL (Port 3306), Redis (Port 6379), Apache Kafka (Port 9092).
2. Khởi chạy `discovery-server` (Netflix Eureka Server tại Port 8761).
3. Khởi chạy các service nghiệp vụ Spring Boot:
   - `identity-service` (Port 8081)
   - `booking-service` (Port 8082)
   - `trip-service` (Port 8083)
   - `payment-service` (Port 8084)
   - `chat_service` (Port 8085)
   - `notification-service` (Port 8086)
   - `locationservice` (Port 8087)
   - `review-service` (Port 8088)
4. Khởi chạy `ai-service` (Python FastAPI eKYC tại Port 8000).
5. Khởi chạy `api-gateway` (Spring Cloud Gateway tại Port 8080).
6. Khởi chạy Web Admin `rideUpMicroUi` (`npm run dev` tại Port 5173).
7. Khởi chạy Mobile App: Mở thư mục `rideup-customer-app` và `rideup-driver-app`, chạy `npx expo start`.

