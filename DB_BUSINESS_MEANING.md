# 📖 RideUpMicro — Ý nghĩa nghiệp vụ từng trường dữ liệu

> Tài liệu này giải thích **tại sao** từng trường tồn tại, nằm trong flow nghiệp vụ nào, ai ghi, ai đọc.  
> Dành cho team dev khi onboard hoặc debug luồng dữ liệu.

---

## 🗂️ 1. `booking_service_db`

---

### 📋 Bảng `booking` — Đơn đặt chỗ

Đây là **bảng trung tâm** của toàn bộ hệ thống. Mỗi booking = 1 khách đặt N ghế trên 1 chuyến xe.

#### Nhóm định danh

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `id` | UUID nội bộ, dùng để giao tiếp giữa các microservice qua Kafka/HTTP |
| `booking_code` | Mã thân thiện hiển thị cho khách (`RU-20241123-XXXX`). Dùng để tra cứu khi khách liên hệ CSKH. UNIQUE để không nhầm lẫn |
| `trip_id` | Chuyến xe đang được đặt. Booking-service không lưu chi tiết trip, chỉ giữ ID để query sang trip-service |
| `customer_id` | Người dùng đang đặt. Có thể đặt cho người khác (xem `passenger_name/phone`) |

#### Nhóm hành khách thực tế

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `passenger_name` | **Tên người sẽ thực sự lên xe**, không nhất thiết trùng với `customer_id`. VD: Mẹ đặt chỗ cho con đi → customer là mẹ, passenger là con |
| `passenger_phone` | SĐT hành khách thực tế → tài xế gọi khi cần liên hệ ở điểm đón. Hiển thị trên màn hình tài xế |
| `seat_count` | Số ghế đặt. Khi confirmed → trip.seat_available giảm đi `seat_count` |
| `total_amount` | = `trip.price_vnd × seat_count`. Lưu tại thời điểm đặt, tránh giá thay đổi sau |

#### Nhóm địa điểm đón/trả

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `pickup_address_text` | Chuỗi địa chỉ hiển thị trên UI: "123 Lê Lợi, Q1, TP.HCM" |
| `pickup_lat / pickup_lng` | Tọa độ GPS điểm đón → tài xế dùng để navigate, hiển thị pin trên map của driver app |
| `pickup_ward_id` | FK → ward. Dùng để validate: pickup ward phải thuộc province của chuyến (FareBoundary check) |
| `dropoff_*` | Tương tự bên trên nhưng cho điểm trả khách |

> **Tại sao lưu cả text lẫn lat/lng lẫn ward_id?**  
> - `text`: hiển thị cho người dùng đọc  
> - `lat/lng`: điều hướng bản đồ thực tế  
> - `ward_id`: kiểm tra business rule (pickup phải trong vùng phục vụ)

#### Nhóm thanh toán

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `payment_id` | FK → payment record trong payment_service_db. Null nếu chưa tạo payment (booking CASH chưa confirm) |
| `payment_method` | `STRIPE` = giữ tiền trước (pre-auth), capture khi trip hoàn thành. `CASH` = trả tiền mặt cho tài xế |
| `payment_status` | **Trạng thái thanh toán phía booking** — đồng bộ từ payment-service qua Kafka. Các giá trị: `PENDING` (chưa tạo payment) → `HOLDING` (Stripe đã hold) → `PAID` (captured) / `VOIDED` (hủy, void pre-auth) / `FAILED` |

> **Tại sao booking cần `payment_status` riêng?**  
> Vì booking-service và payment-service là 2 service tách biệt. Booking-service cần biết trạng thái thanh toán để quyết định có confirm booking không, mà không phải call sang payment-service mỗi lần. Dữ liệu được đồng bộ qua Kafka event.

#### Nhóm trạng thái & thời gian

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `status` | Trạng thái vòng đời booking: `PENDING` → `CONFIRMED` → `COMPLETED` / `CANCELLED` |
| `expires_at` | **Deadline booking phải được confirm** (SLA từ admin config). Nếu quá hạn, scheduler tự cancel. Giá trị = `created_at + BOOKING_EXPIRY_MINUTES` |
| `reserved_at` | Thời điểm khách bấm "Xác nhận đặt chỗ". Dùng để tính thời gian khách phản hồi lời mời của tài xế |
| `cancelled_at` | Ghi lại chính xác lúc nào bị hủy (audit, analytics) |
| `cancel_reason` | Lý do hủy: "DRIVER_CANCELLED", "CUSTOMER_CANCELLED", "EXPIRED", "TRIP_CANCELLED"... |
| `completed_at` | Thời điểm booking chuyển sang COMPLETED (khi trip COMPLETED). Dùng để tính thời gian hoàn tất |
| `version` | **Optimistic locking** — tránh 2 request cùng lúc modify booking. Nếu version không khớp → throw exception, retry |
| `created_at / updated_at` | Audit cơ bản |

#### Trường `note`

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `note` | Ghi chú của khách gửi tài xế: "Mang theo 1 vali to", "Đón ở cổng bên phải". Hiển thị trên màn hình tài xế khi xem booking |

---

### 📋 Bảng `booking_modifications` — Yêu cầu chỉnh sửa booking

Khi khách muốn **đổi điểm đón/trả sau khi đã đặt**, thay vì sửa thẳng booking (vì tài xế cần duyệt), hệ thống tạo 1 modification request.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `booking_id / trip_id` | Yêu cầu này thuộc về booking và trip nào |
| `customer_id` | Ai gửi yêu cầu (audit) |
| `status` | `PENDING_DRIVER` → chờ tài xế. `APPROVED` → tài xế đồng ý → booking được cập nhật. `REJECTED` → bác bỏ → booking giữ nguyên. `EXPIRED` → quá hạn → tự động reject |
| `expires_at` | Hạn tài xế phải phản hồi (SLA: `MODIFICATION_EXPIRY_MINUTES`). Hết hạn → auto reject, booking giữ nguyên |
| `resolved_at` | Lúc tài xế bấm Duyệt/Từ chối |
| `rejection_reason` | Tài xế giải thích tại sao không đồng ý |
| `new_pickup_* / new_dropoff_*` | Thông tin mới khách muốn đổi sang |
| `old_pickup_* / old_dropoff_*` | **Snapshot** thông tin cũ tại thời điểm gửi yêu cầu. Dùng để rollback nếu bị reject, và để tài xế so sánh khác biệt trước/sau |
| `new_note / old_note` | Ghi chú mới và cũ (cũng có thể thay đổi) |
| `new/old_passenger_name/phone` | Hành khách mới/cũ (đổi người đi) |

---

### 📋 Bảng `system_timeout_config` — Cấu hình SLA của admin

Thay vì hardcode timeout trong code, admin có thể chỉnh động qua giao diện.

| `config_key` | Ý nghĩa |
|---|---|
| `BOOKING_EXPIRY_MINUTES` | Booking tạo ra nhưng không được confirm trong N phút → auto cancel |
| `MODIFICATION_EXPIRY_MINUTES` | Tài xế không phản hồi yêu cầu sửa trong N phút → auto reject |
| `TRIP_REQUEST_EXPIRY_MINUTES` | Yêu cầu tìm chuyến của hành khách hết hạn sau N phút |
| `INVITATION_EXPIRY_MINUTES` | Lời mời từ tài xế → hành khách phải phản hồi trong N phút |

| Trường | Ý nghĩa |
|---|---|
| `value_minutes` | Giá trị thời gian (phút), không có min/max — admin toàn quyền config |
| `updated_by` | Admin nào đã thay đổi (accountability) |

---

## 💳 2. `payment_service_db`

---

### 📋 Bảng `payment` — Giao dịch Stripe

Mỗi booking Stripe tạo 1 payment record. Flow: **tạo PaymentIntent** (hold tiền) → khách confirm → **capture** (thu tiền) khi trip hoàn thành. Nếu hủy → **void** (trả lại hold).

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `booking_id` | 1-1 với booking. UNIQUE vì mỗi booking chỉ có 1 payment |
| `amount` | Số tiền hold trên Stripe (= booking.total_amount) |
| `method` | `STRIPE` hoặc `CASH`. Nếu CASH → record này chỉ để tracking, không thực sự charge Stripe |
| `status` | Trạng thái Stripe: `REQUIRES_CAPTURE` (đã hold, chờ capture) → `CAPTURED` (đã thu) / `CANCELED` (void) |
| `transaction_id` | **Stripe PaymentIntent ID** (`pi_xxx...`). Dùng để gọi Stripe API capture/cancel |
| `client_secret` | **Stripe client secret** (`pi_xxx_secret_yyy`) → gửi về app để khách xác nhận thanh toán phía client (nhập CVV, 3D Secure). Đây không phải URL mà là secret token của Stripe |
| `correlation_id` | ID truy vết saga/event chain. Khi event Kafka mang correlation_id này → biết đây là response của request nào |
| `paid_at` | Thời điểm Stripe confirm capture thành công (webhook từ Stripe) |
| `failure_reason` | Lý do Stripe từ chối: "insufficient_funds", "card_declined"... |

---

### 📋 Bảng `driver_payout_transaction` — Chi tiền cho tài xế

Sau khi trip COMPLETED, payment-service tính toán và chuyển tiền cho tài xế qua Stripe Transfer (nếu đã connect Stripe) hoặc ghi nợ (nếu CASH).

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `booking_id` | UNIQUE — mỗi booking chỉ payout 1 lần |
| `driver_id` | Tài xế nhận tiền |
| `total_fare` | Tổng tiền chuyến (booking.total_amount) |
| `commission_rate` | Tỷ lệ hoa hồng áp dụng **tại thời điểm payout** (dynamic — phụ thuộc rating/reputation tài xế) |
| `commission_amount` | = `total_fare × commission_rate`. Số tiền platform thu |
| `net_driver_income` | = `total_fare - commission_amount`. Thu nhập trước khi trừ nợ |
| `debt_before` | Dư nợ hoa hồng của tài xế trước giao dịch này |
| `debt_deducted` | Phần nợ bị khấu trừ từ `net_driver_income` lần này |
| `debt_after` | Dư nợ còn lại sau giao dịch |
| `final_payout_amount` | Số tiền thực sự chuyển qua Stripe = `net_driver_income - debt_deducted`. Có thể = 0 nếu nợ cao |
| `stripe_account_id` | Stripe Connected Account của tài xế (`acct_xxx`) |
| `stripe_transfer_id` | Stripe Transfer ID (`tr_xxx`) — dùng để tra cứu khi có vấn đề |
| `status` | `PENDING` → `COMPLETED` / `FAILED` / `FULL_DEBT_OFFSET` (toàn bộ bị trừ nợ) / `SKIPPED_NOT_ONBOARDED` (tài xế chưa kết nối Stripe) |
| `failure_reason` | Lý do Stripe Transfer thất bại |

> **Luồng tính nợ:** Tài xế nhận chuyến CASH → không có tiền chuyển về platform → platform ghi nợ commission. Các chuyến Stripe sau → tự động khấu trừ nợ trước khi chuyển phần còn lại.

---

## 🚗 3. `trip_service_db`

---

### 📋 Bảng `trip` — Chuyến xe của tài xế

Tài xế tạo chuyến xe, hành khách tìm kiếm và đặt chỗ.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `driver_id` | Tài xế sở hữu chuyến |
| `vehicle_id` | Xe sử dụng cho chuyến này (ảnh hưởng seat_total) |
| `start_province_id / end_province_id` | Điểm đi / điểm đến theo tỉnh. Dùng để hành khách filter tìm kiếm |
| `start_address_text / end_address_text` | Địa điểm cụ thể tài xế nhập. VD: "Bến xe Miền Đông, TP.HCM" |
| `departure_time` | Thời gian khởi hành. Hành khách filter theo ngày/giờ |
| `estimated_arrival_time` | Thời gian đến dự kiến. Thông tin tham khảo cho hành khách |
| `price_vnd` | Giá/ghế tài xế tự đặt. Phải nằm trong `fare_boundary_config` (min/max/km) |
| `seat_total` | Tổng ghế chuyến (copy từ vehicle.seat_capacity khi tạo trip) |
| `seat_available` | Ghế còn trống real-time. Giảm khi booking confirmed, tăng khi booking cancelled. `seat_available = 0` → status = FULL |
| `status` | `DRAFT` (tạo chưa đăng) → `OPEN` (đang nhận khách) → `FULL` (hết chỗ) / `STARTED` (đã khởi hành) → `COMPLETED` / `CANCELED` |
| `note` | Tài xế ghi chú cho hành khách: "Xe 7 chỗ, có điều hòa, nhạc theo yêu cầu" |
| `cancel_reason / cancelled_at` | Lý do và thời điểm hủy chuyến. Khi trip bị cancel → tất cả booking CONFIRMED cũng bị cancel kèm |
| `version` | Optimistic lock. Quan trọng khi nhiều booking cùng lúc giảm seat_available |

---

### 📋 Bảng `trip_stop` — Điểm dừng trên lộ trình

Trip có thể có nhiều điểm đón và nhiều điểm trả (không chỉ điểm đầu/cuối).

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `trip_id` | Thuộc chuyến nào |
| `stop_type` | `PICKUP` = điểm đón khách, `DROPOFF` = điểm trả khách |
| `ward_id` | Ward của điểm dừng → dùng để validate booking pickup/dropoff có hợp lệ không |
| `address_text` | Địa chỉ cụ thể tài xế nhập cho điểm dừng đó |

---

### 📋 Bảng `trip_request` — Yêu cầu tìm chuyến của hành khách

Flow ngược: thay vì hành khách tìm chuyến, hành khách **đăng nhu cầu** và tài xế **chủ động mời**.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `passenger_id` | Hành khách đăng nhu cầu |
| `start/end_province_id` | Tỉnh đi / đến → tài xế filter các TripRequest khớp với lộ trình của mình |
| `start/end_ward_id` | Xã/phường cụ thể → độ chính xác cao hơn tỉnh |
| `start/end_address_text` | Địa chỉ cụ thể hành khách ghi |
| `departure_time` | Thời gian mong muốn khởi hành |
| `seat_total` | Số ghế cần (tài xế cần có đủ `seat_available`) |
| `note` | Yêu cầu đặc biệt: "Có mang theo xe đạp", "Cần ghế trẻ em" |
| `status` | `OPEN` (đang chờ) → `ACCEPTED` (đã có tài xế accept) / `CANCELLED` / `EXPIRED` |
| `expires_at` | Hạn request còn hiệu lực. Hết hạn → auto EXPIRED, tài xế không còn thấy |
| `version` | Optimistic lock — tránh 2 tài xế cùng accept cùng lúc |

---

### 📋 Bảng `trip_request_invitation` — Lời mời từ tài xế

Khi tài xế thấy TripRequest phù hợp, gửi lời mời. Hành khách có thể chấp nhận 1 trong nhiều lời mời.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `trip_request_id` | Lời mời thuộc TripRequest nào |
| `trip_id` | Chuyến xe tài xế đang mời hành khách lên |
| `driver_id` | Tài xế gửi lời mời |
| `message` | Lời nhắn kèm theo: "Mình đi qua bến xe Giáp Bát, có thể đón bạn" |
| `status` | `PENDING` → `ACCEPTED` (hành khách đồng ý → tạo booking) / `REJECTED` / `EXPIRED` |
| `responded_at` | Hành khách phản hồi lúc nào (audit) |

---

### 📋 Bảng `fare_boundary_config` — Giới hạn giá tài xế được đặt

Admin cấu hình để tránh tài xế hét giá hoặc phá giá quá mức.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `min_price_per_km` | Giá/km tối thiểu (VND). Tài xế đặt thấp hơn → bị từ chối |
| `max_price_per_km` | Giá/km tối đa (VND). Tài xế đặt cao hơn → bị từ chối |
| `road_factor` | Hệ số quy đổi đường bộ. VD: 1.3 = đường bộ dài hơn 30% so với đường thẳng (Haversine). Dùng để tính `estimated_road_distance = straight_distance × road_factor`, sau đó validate `price_vnd / estimated_road_distance` nằm trong `[min, max]` |
| `enabled` | Có áp dụng giới hạn không. Admin có thể tắt tạm thời |

---

### 📋 Bảng `processed_kafka_event` — Idempotency store

Đảm bảo mỗi Kafka event chỉ được xử lý **đúng 1 lần**, dù Kafka deliver nhiều lần.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `event_id` | Kafka message key/UUID của event. UNIQUE → INSERT sẽ fail nếu đã xử lý |
| `event_type` | Loại event: `BOOKING_CONFIRMED`, `TRIP_COMPLETED`... (phục vụ debug) |
| `correlation_id` | ID saga chain (truy vết chuỗi event liên quan) |
| `processed_at` | Thời điểm xử lý (dùng để cleanup record cũ định kỳ) |

---

### 📋 Bảng `shedlock` — Distributed Job Lock

Khi nhiều instance trip-service chạy song song, ShedLock đảm bảo scheduled job (VD: expire trip_request) chỉ chạy **1 instance tại 1 thời điểm**.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `name` | Tên job: `expireTripRequests`, `cancelExpiredInvitations`... |
| `lock_until` | Lock còn hiệu lực đến lúc nào. Sau thời gian này, instance khác có thể giành lock |
| `locked_at` | Lúc nào bắt đầu lock |
| `locked_by` | Hostname:port của instance đang giữ lock |

---

## 👤 4. `identity_service_db`

---

### 📋 Bảng `user` — Tài khoản người dùng

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `email` | Định danh chính, dùng để đăng nhập |
| `phone_number` | SĐT — có thể dùng đăng nhập OTP. Cũng hiển thị để liên hệ |
| `full_name` | Tên đầy đủ hiển thị trên UI và trong booking |
| `password` | Hash bcrypt. NULL nếu tài khoản chỉ dùng OTP/social login |
| `avatar_url` | URL ảnh đại diện trên Cloudinary/S3 |
| `date_of_birth` | Thông tin cá nhân (mostly NULL hiện tại — chưa collect bắt buộc) |
| `gender` | Giới tính (thông tin cá nhân, chưa dùng trong business rule) |
| `verified` | Đã xác minh SĐT/email. `false` → tài khoản bị giới hạn tính năng |

---

### 📋 Bảng `user_roles` — Phân quyền

| Ý nghĩa |
|---|
| Composite PK `(user_id, role)` → 1 user có thể vừa là DRIVER vừa là PASSENGER |
| Role `ADMIN` → truy cập admin dashboard, không thể đặt chỗ |
| Role `DRIVER` → tạo trip, nhận booking |
| Role `PASSENGER` → tìm trip, đặt chỗ |

---

### 📋 Bảng `driver_profile` — Hồ sơ tài xế

Tạo khi user DRIVER đăng ký. Phải được admin APPROVE trước khi tạo trip.

#### Nhóm giấy tờ

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `cccd` | Số CCCD — xác minh danh tính thực |
| `cccd_image_front/back` | URL ảnh 2 mặt CCCD trên cloud storage |
| `gplx` | Số bằng lái |
| `gplx_expiry_date` | Ngày hết hạn GPLX — hệ thống có thể cảnh báo gần hết hạn |
| `gplx_image_front/back` | URL ảnh GPLX 2 mặt |
| `gplx_class` | Hạng bằng: B1, B2, D,... → xác định được lái loại xe nào |
| `gplx_issue_date` | Ngày cấp (ít dùng trong business rule) |
| `gplx_issue_place` | Nơi cấp (ít dùng) |

#### Nhóm xác minh khuôn mặt (Face Verification)

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `portrait_image` | Ảnh chân dung tham chiếu khi đăng ký (lấy từ CCCD hoặc selfie) |
| `face_embedding` | Vector 128/512 chiều đại diện khuôn mặt (AI model tạo ra). Lưu dưới dạng JSON/text |
| `is_face_enrolled` | Đã enroll khuôn mặt vào hệ thống chưa |
| `face_match_score` | Điểm khớp lần verify gần nhất (0-1). Dùng để audit |
| `last_face_verified_at` | Lần cuối xác minh khuôn mặt. Nếu quá lâu → có thể yêu cầu verify lại |

> **Mục đích face verify:** Đảm bảo người đang lái xe là tài xế đã đăng ký, không phải người khác.

#### Nhóm thống kê & hoa hồng

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `driver_rating` | Điểm đánh giá trung bình (1-5 sao). Ảnh hưởng commission rate |
| `total_driver_rides` | Tổng số chuyến hoàn thành. Hiển thị cho hành khách tham khảo |
| `reputation_score` | Điểm uy tín nội bộ (0-100). Tăng khi hoàn thành chuyến, giảm khi hủy, vi phạm. Ảnh hưởng commission rate và min_accept_score |
| `system_debt` | Dư nợ hoa hồng hiện tại (tổng hợp từ debt_transactions). Nếu > credit_limit → tài xế không nhận chuyến được |

#### Nhóm Stripe

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `stripe_account_id` | ID Stripe Connected Account (`acct_xxx`). NULL nếu chưa kết nối |
| `stripe_account_status` | `NOT_CONNECTED` → `PENDING_VERIFICATION` (đang KYC với Stripe) → `ACTIVE` (nhận được tiền) / `RESTRICTED` (Stripe khóa) |
| `stripe_payouts_enabled` | Stripe đã enable payout (tài xế có thể rút tiền). FALSE dù account ACTIVE nếu KYC chưa đủ |

#### Nhóm operating

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `operating_provinces` | JSON array province IDs tài xế đăng ký hoạt động. VD: `["HAN", "NIN"]`. Dùng để filter notification broadcast theo tỉnh |

---

### 📋 Bảng `vehicle` — Phương tiện của tài xế

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `driver_id` | UNIQUE → 1 tài xế 1 xe. Muốn đổi xe → update record này |
| `vehicle_type` | Enum loại xe (CAR_4_SEAT, BUS_45_SEAT,...). Quyết định `seat_capacity` tối đa |
| `vehicle_brand/model/color/year` | Thông tin để hành khách nhận dạng xe ở điểm đón |
| `plate_number` | Biển số xe — hiển thị rõ ràng cho hành khách khi booking confirmed |
| `seat_capacity` | Số ghế thực tế (copy vào trip.seat_total khi tạo trip) |
| `vehicle_image` | Ảnh xe để hành khách nhận dạng |
| `insurance_image / expiry_date` | Giấy bảo hiểm xe — admin kiểm tra khi duyệt |
| `registration_image / expiry_date` | Đăng ký xe — admin kiểm tra khi duyệt |
| `is_active` | Xe đang được sử dụng. FALSE → đã nghỉ hoặc đang sửa |
| `is_verified` | Admin đã kiểm tra và xác nhận xe hợp lệ |
| `approved/rejected_*` | Audit trail: ai duyệt/từ chối, lúc nào, lý do gì |

---

### 📋 Bảng `commission_config` — Cấu hình hoa hồng động

Hoa hồng không cố định mà phụ thuộc rating và reputation tài xế.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `base_rate` | Tỷ lệ hoa hồng cơ bản (vd: 10%) — áp dụng cho tài xế có rating/reputation = benchmark |
| `min_rate` | Tỷ lệ thấp nhất (vd: 7%) — tài xế xuất sắc được hưởng |
| `max_rate` | Tỷ lệ cao nhất (vd: 15%) — tài xế kém bị áp |
| `rating_benchmark` | Ngưỡng rating chuẩn (vd: 4.5 sao). Dưới ngưỡng → commission tăng; trên ngưỡng → giảm |
| `rating_step` | Mỗi 0.1 sao lệch khỏi benchmark → commission +/- bao nhiêu % |
| `reputation_benchmark` | Ngưỡng reputation điểm (vd: 70). Tương tự rating |
| `reputation_step` | Mỗi 10 điểm reputation lệch → commission +/- bao nhiêu % |
| `credit_limit` | Nợ hoa hồng tối đa được phép (vd: 500,000 VND). Vượt qua → tài xế bị block nhận chuyến |
| `min_accept_score` | Điểm reputation tối thiểu để driver có thể accept invitation (kiểm soát chất lượng) |

---

### 📋 Bảng `debt_transactions` — Lịch sử nợ hoa hồng

Mỗi dòng = 1 sự kiện thay đổi nợ của tài xế. Dùng để audit và tính `system_debt` hiện tại.

| `type` | Ý nghĩa |
|---|---|
| `CASH_COMMISSION` | Chuyến trả tiền mặt → platform chưa thu được → ghi tăng nợ |
| `STRIPE_COMMISSION` | Chuyến Stripe → đã capture → platform thu được → nợ không tăng (hoặc ghi để theo dõi) |
| `STRIPE_OFFSET` | Khấu trừ nợ từ tiền chuyến Stripe (đã có trong driver_payout_transaction) |
| `MANUAL_PAYMENT` | Admin điều chỉnh thủ công (VD: tài xế nộp tiền mặt tại văn phòng) |
| `ADJUSTMENT` | Điều chỉnh đặc biệt (sai sót, khiếu nại,...) |

---

### 📋 Bảng `refresh_token` — Phiên đăng nhập

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `token` | JWT refresh token (long-lived). Dùng để lấy access token mới mà không cần đăng nhập lại |
| `device_info` | Thiết bị: "iPhone 15, iOS 17.1". Hiển thị trong "Quản lý phiên đăng nhập" |
| `expires_at` | Hạn token (thường 30-90 ngày) |
| `is_revoked` | Token bị thu hồi (logout, đổi mật khẩu, admin ban). Dù chưa hết hạn vẫn không dùng được |

---

### 📋 Bảng `admin_audit_logs` — Nhật ký hành động admin

Ghi lại **mọi thay đổi quan trọng** admin làm để có thể rollback, điều tra, kiểm toán.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `actor_id / actor_email` | Admin thực hiện hành động |
| `action` | Mã hành động: `APPROVE_DRIVER`, `REJECT_VEHICLE`, `UPDATE_COMMISSION_CONFIG`... |
| `service_name` | Service nào thực hiện: `identity-service`, `booking-service`... |
| `target_type / target_id` | Object bị tác động: `DriverProfile/uuid-xxx`, `CommissionConfig/singleton` |
| `old_value / new_value` | JSON snapshot trước/sau thay đổi. Dùng để rollback hoặc so sánh |
| `event_id` | Idempotency — tránh log trùng nếu event Kafka deliver nhiều lần |

---

## 🔔 5. `notification_service_db`

---

### 📋 Bảng `notification` — Thông báo in-app

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `user_id` | Ai nhận thông báo |
| `type` | Loại thông báo — quyết định icon, màu sắc, action khi tap: `BOOKING_CONFIRMED` → mở màn hình booking, `PAYMENT_SUCCESS` → mở màn hình thanh toán |
| `title / message` | Nội dung hiển thị trên notification tray và trong notification list |
| `metadata` | JSON linh hoạt: `{"bookingId": "xxx", "tripId": "yyy"}` → app dùng để navigate đến màn hình đúng khi user tap |
| `status` | `UNREAD/READ` — hiển thị badge số thông báo chưa đọc |
| `read_at` | Lúc nào đọc (analytics: thông báo nào có tỷ lệ đọc cao) |

---

### 📋 Bảng `broadcast_campaigns` — Chiến dịch thông báo hàng loạt

Admin tạo chiến dịch gửi notification đến nhóm user theo tiêu chí.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `target_role` | Gửi cho DRIVER hay PASSENGER |
| `channels` | Kênh: `IN_APP`, `PUSH_NOTIFICATION`, `EMAIL`... |
| `province_ids` | JSON array — chỉ gửi cho user ở các tỉnh được chọn. NULL = gửi toàn quốc |
| `min/max_reputation` | Filter tài xế theo điểm uy tín. VD: gửi ưu đãi cho tài xế `reputation >= 80` |
| `status` | `DRAFT` (đang soạn) → `SENDING` (đang gửi) → `SENT` / `FAILED` |
| `total_recipients` | Tổng số user thỏa điều kiện filter |
| `total_delivered` | Số đã gửi thành công (tracking delivery rate) |
| `delivery_note` | Ghi chú kết quả: "Gửi thất bại 23 devices do token expired" |

---

## 📍 6. `location_service_db`

---

### 📋 Bảng `province` — Tỉnh/thành phố

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `code` | Mã ngắn: `HAN`, `HCM`, `DNI`... Dùng trong API response gọn |
| `name` | Tên đầy đủ: "Hà Nội", "TP. Hồ Chí Minh" — hiển thị UI |
| `lat / lng` | Tọa độ trung tâm tỉnh. **Dùng trong FareBoundaryService**: tính khoảng cách Haversine giữa 2 tỉnh để validate giá/km tài xế đặt |
| `osm_id` | OpenStreetMap relation ID — dùng nếu tích hợp routing/geocoding OSM |

---

### 📋 Bảng `ward` — Xã/phường/thị trấn

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `province_id` | FK → province. Phân cấp hành chính |
| `name` | Tên xã/phường: "Phường Bến Nghé" |
| `display_name` | Tên đầy đủ hierarchical: "Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh". Hiển thị trong autocomplete địa chỉ |
| `lat / lng` | Tọa độ trung tâm xã/phường. Dùng để validate: pickup ward phải nằm trong khoảng cách `max_distance_km` tính từ trip stop |
| `code` | Mã xã/phường theo tiêu chuẩn hành chính |
| `osm_id` | OpenStreetMap ID |

---

### 📋 Bảng `location_distance_configs` — Giới hạn khoảng cách đón/trả theo tỉnh

Admin cấu hình: điểm đón/trả của hành khách phải cách điểm dừng của chuyến không quá `max_distance_km`.

| Trường | Ý nghĩa nghiệp vụ |
|---|---|
| `province_id` | UNIQUE — mỗi tỉnh 1 config |
| `max_distance_km` | Khoảng cách tối đa (km). VD: 2km → khách phải đứng trong vòng 2km tính từ trip stop |
| `is_active` | Có áp dụng rule không. `false` → cho phép đón/trả bất kỳ đâu trong tỉnh |

> **Mục đích:** Đảm bảo tài xế không phải đi quá xa để đón/trả khách, giữ chuyến đúng lộ trình.
