# 🚌 LUỒNG CHI TIẾT: CHỢ NHU CẦU DI CHUYỂN (PASSENGER REQUEST MARKETPLACE)
> **Dự án:** RideUpMicro | **Phân tích bởi:** Senior Backend Java

---

## 🎯 1. BẢN CHẤT NGHIỆP VỤ (BUSINESS CORE)

Tính năng "Chợ Nhu Cầu Di Chuyển" thay đổi mô hình hoạt động của nền tảng từ **1 chiều** (Tài xế tạo chuyến $\rightarrow$ Khách tìm kiếm) sang **2 chiều** (Khách đưa ra nhu cầu $\rightarrow$ Sàn giao dịch $\leftarrow$ Tài xế phục vụ).

### 1.1 Giá trị mang lại:
- **Với Khách Hàng (Passenger):** Không bị "bỏ rơi" khi tìm kiếm không ra kết quả. Việc đưa ra yêu cầu giúp họ cảm thấy nền tảng có ích hơn việc đi ra ngoài các hội nhóm Facebook.
- **Với Tài Xế (Driver):** Tối ưu hóa thu nhập. Tài xế không cần "đoán" xem tuyến đường nào đang có khách. Họ nhìn vào Chợ Nhu Cầu $\rightarrow$ Thấy điểm nào đang "nóng" $\rightarrow$ Tạo chuyến ngay tuyến đó.
- **Với Nền Tảng (RideUp):** Tăng tỷ lệ khớp lệnh (Matching Rate), giảm tỷ lệ khách rời bỏ App (Churn Rate).

### 1.2 Nguyên tắc nghiệp vụ cốt lõi (Business Rules):
1. **Chống Spam (Anti-Spam):** Một khách hàng không được phép đăng nhiều yêu cầu trùng tuyến và khung giờ cùng lúc. Nếu đã có 1 Booking thành công trong khung giờ đó, không được đăng yêu cầu nữa.
2. **Quyền Lựa Chọn Của Khách (Customer Centric):** Một yêu cầu (`TripRequest`) có thể nhận được lời mời từ NHIỀU tài xế khác nhau. Khách hàng là người có quyền xem xét (xem rating tài xế, xem xe, xem giá) và **CHỌN DUY NHẤT 1** lời mời.
3. **Smart Matching (Ghép nối thông minh):** Hệ thống không tự động ghép (Auto-match) một cách cứng nhắc mà cung cấp Bộ Lọc (Filter) cho tài xế và Push Notification theo Tỉnh đăng ký hoạt động (`operatingProvinces`) của tài xế để tăng độ chính xác.
4. **Bảo vệ Quyền Riêng Tư (Privacy):** Khi nằm trên "Chợ Nhu Cầu", yêu cầu chỉ hiện Tên, Avatar, Tuyến đường. **SỐ ĐIỆN THOẠI BỊ ẨN** cho đến khi khách hàng chính thức "Chấp Nhận Lời Mời" và tạo thành Booking (ngăn chặn việc tài xế gọi điện tranh giành khách ngoài App).
5. **Time-to-Live (Vòng đời):** Yêu cầu có hạn sử dụng (`expiresAt`). Quá giờ mà không ai nhận, yêu cầu tự động biến mất khỏi chợ để giữ cho Sàn luôn "sạch sẽ" và chính xác với thời gian thực.

### 1.3 Hành Trình Người Dùng (User Journey):
**Tình huống thực tế:** Khách muốn đi Hà Nội $\rightarrow$ Thái Bình lúc 15:00.
1. **Khách** tìm chuyến lúc 15:00 $\rightarrow$ Trống không. Bấm nút **"Đăng Yêu Cầu"**.
2. **Hệ thống** lập tức "hét lên" (Push Notification) tới tất cả các tài xế chuyên chạy tuyến Hà Nội / Thái Bình: *"Có khách VIP đang cần đi Thái Bình lúc 3h chiều kìa!"*
3. **Tài xế A, B, C** mở App, thấy khách. Tài xế A và B quyết định gửi lời mời.
4. **Khách** nhận 2 thông báo. Mở ra xem thấy Tài xế A giá rẻ hơn, xe xịn hơn $\rightarrow$ Bấm **[Chấp Nhận]** lời mời của A.
5. **Hệ thống** tạo Booking cho Khách và Tài xế A. Đồng thời thông báo cho B: *"Rất tiếc khách đã chọn người khác."*

---

## 📌 2. MỤC TIÊU TÍNH NĂNG (TECHNICAL)
Giải quyết bài toán: **Khách hàng tìm kiếm chuyến nhưng kết quả = 0**.
Thay vì để khách rời App, hệ thống cho phép khách **đăng yêu cầu di chuyển** và tài xế chủ động **tìm + mời khách** vào chuyến.

---

## 🗂️ 3. DATA MODEL — CÁC ENTITY MỚI

### Entity 1: `TripRequest` (Yêu cầu di chuyển — thuộc `trip-service`)

| Field | Type | Ghi chú |
|---|---|---|
| `id` | String (UUID) | PK |
| `customerId` | String | Lấy từ JWT |
| `startProvinceId` | String | Tỉnh/TP điểm đi |
| `startWardId` | String | Xã/Phường điểm đi (nullable) |
| `endProvinceId` | String | Tỉnh/TP điểm đến |
| `endWardId` | String | Xã/Phường điểm đến (nullable) |
| `desiredDepartureTime` | LocalDateTime | Khung giờ mong muốn |
| `seatCount` | Integer | Số ghế cần |
| `note` | String | Ghi chú hành lý |
| `status` | Enum | `OPEN / ACCEPTED / EXPIRED / CANCELLED` |
| `expiresAt` | LocalDateTime | Tự hết hạn sau N phút |
| `cancelledAt` | LocalDateTime | nullable |
| `cancelReason` | String | nullable |
| `version` | Long | **Optimistic Lock** — chống race condition |
| `createdAt` | LocalDateTime | |

**DB Indexes:**
```sql
-- Index chính cho Marketplace query
CREATE INDEX idx_marketplace ON trip_request (start_province_id, end_province_id, status, desired_departure_time);
-- Index cho Scheduler expire
CREATE INDEX idx_expire ON trip_request (status, expires_at);
-- Index cho My Requests của khách
CREATE INDEX idx_customer ON trip_request (customer_id, status);
```

---

### Entity 2: `TripRequestInvitation` (Lời mời của tài xế — thuộc `trip-service`)

| Field | Type | Ghi chú |
|---|---|---|
| `id` | String (UUID) | PK |
| `tripRequestId` | String | FK → TripRequest |
| `tripId` | String | FK → Trip (chuyến xe của tài xế) |
| `driverId` | String | ID tài xế gửi lời mời |
| `status` | Enum | `PENDING / ACCEPTED / REJECTED / EXPIRED` |
| `message` | String | Lời nhắn tùy chọn của tài xế |
| `respondedAt` | LocalDateTime | Thời điểm khách phản hồi |
| `createdAt` | LocalDateTime | |

**Constraint quan trọng:**
```sql
-- 1 chuyến chỉ được mời 1 TripRequest đúng 1 lần (chống spam)
UNIQUE CONSTRAINT (trip_request_id, trip_id)
```

---

### Bổ sung `DriverProfile` (tại `identity-service`)

```
+ operatingProvinceIds : String  -- JSON Array: ["ha-noi", "ha-nam", "nam-dinh"]
  -- Tài xế đăng ký tuyến tỉnh mình hay chạy (TỐI ĐA 5 TỈNH để chống spam)
  -- Dùng để Smart Push Notification đúng đối tượng bằng logic AND (chứa cả tỉnh đi và đến)
```

---

## 🌊 4. 8 LUỒNG NGHIỆP VỤ CHI TIẾT

---

### LUỒNG 1 — KHÁCH ĐĂNG YÊU CẦU DI CHUYỂN

```
[App Khách]
    │
    ├──► Tìm kiếm chuyến → Kết quả = 0
    │    Hiển thị nút nổi bật: [ĐĂNG YÊU CẦU TÌM XE]
    │
    ▼
POST /api/trip/requests
Body: {
    startProvinceId, startWardId,
    endProvinceId,   endWardId,
    desiredDepartureTime,
    seatCount,
    note
}
    │
    ▼
TripRequestService.createTripRequest()
    │
    ├── VALIDATE:
    │   ├── desiredDepartureTime > NOW + 30 phút ?
    │   │   └── Không → DEPARTURE_TIME_TOO_SOON
    │   ├── 1 ≤ seatCount ≤ 10 ?
    │   │   └── Không → INVALID_SEAT_COUNT
    │   ├── Khách đã có TripRequest OPEN trùng tuyến + giờ chưa?
    │   │   └── Có → DUPLICATE_TRIP_REQUEST (chống spam)
    │   └── Khách đang có Booking CONFIRMED trùng khung giờ chưa?
    │       └── Có → CUSTOMER_ALREADY_HAS_BOOKING
    │
    ├── TẠO TripRequest:
    │   ├── status = OPEN
    │   ├── expiresAt = min(NOW + 60 phút, desiredDepartureTime - 60 phút)
    │   └── Lưu DB
    │
    └── BẮN Kafka: [trip-request-created]
            │
            └──► notification-service
                    ├── Feign → identity-service.getDriversByProvinces(startProvinceId, endProvinceId)
                    │   (Lưu ý: Dùng logic AND - Tài xế phải đăng ký CẢ Tỉnh đi VÀ Tỉnh đến mới nhận được Push)
                    └── Push Notification đến tài xế thoả mãn điều kiện:
                        "Có 2 khách cần đi Hà Nội → Hà Nam lúc 15h. Xem ngay!"

RESPONSE:
{
    "code": 1000,
    "message": "Trip request created successfully",
    "result": {
        "id": "req-uuid-123",
        "status": "OPEN",
        "expiresAt": "2026-10-05T16:00:00"
    }
}
```

---

### LUỒNG 2 — TÀI XẾ LỌC & DUYỆT DANH SÁCH TRÊN CHỢ

```
[App Tài Xế — Màn hình "Chợ Nhu Cầu"]
    │
    ▼
GET /api/trip/requests/marketplace
Params:
    startProvinceId (bắt buộc)
    endProvinceId   (bắt buộc)
    startWardId     (tuỳ chọn)
    endWardId       (tuỳ chọn)
    fromTime        (tuỳ chọn)
    toTime          (tuỳ chọn)
    minSeat         (tuỳ chọn)
    page, size      (phân trang)
    │
    ▼
TripRequestService.getMarketplace(filter)
    │
    ├── QUERY DB (dùng Composite Index → nhanh):
    │   WHERE  status = 'OPEN'
    │     AND  expires_at > NOW()         ← chỉ hiện đơn còn hạn
    │     AND  start_province_id = ?
    │     AND  end_province_id   = ?
    │     AND  desired_departure_time BETWEEN fromTime AND toTime
    │     AND  seat_count >= minSeat
    │   ORDER BY desired_departure_time ASC, created_at DESC
    │   LIMIT page, size
    │
    ├── BATCH Feign → identity-service lấy info khách:
    │   Chỉ lấy: { fullName, avatarUrl }
    │   KHÔNG trả số điện thoại (chưa confirm → bảo vệ privacy khách)
    │
    └── RESPONSE:
{
    "count": 15,
    "result": [
        {
            "id": "req-uuid-123",
            "customerName": "Nguyễn Thị A",
            "customerAvatar": "https://...",
            "startProvinceName": "Hà Nội",
            "endProvinceName": "Hà Nam",
            "desiredDepartureTime": "2026-10-05T15:00:00",
            "seatCount": 2,
            "note": "Có 1 vali nhỏ",
            "expiresAt": "2026-10-05T14:00:00",
            "pendingInvitationCount": 1   ← tài xế khác đã mời chưa
        }
    ]
}
```

---

### LUỒNG 3 — TÀI XẾ GỬI LỜI MỜI GHÉP CHUYẾN

> **Điều kiện tiên quyết:** Tài xế phải đã có Trip ở trạng thái `STARTED`.

```
[App Tài Xế] Bấm [GỬI LỜI MỜI] cho TripRequest req-uuid-123
    │
    ▼
POST /api/trip/requests/{requestId}/invite
Body: {
    tripId: "trip-uuid-456",
    message: "Mình đi đúng tuyến, xuất phát 14:30"
}
    │
    ▼
TripRequestService.sendInvitation(requestId, tripId, driverId)
    │
    ├── VALIDATE TripRequest:
    │   ├── Tồn tại?              → 404 nếu không
    │   ├── status == OPEN?       → TRIP_REQUEST_NOT_OPEN nếu không
    │   └── expiresAt > NOW?      → TRIP_REQUEST_EXPIRED nếu hết hạn
    │
    ├── VALIDATE Trip:
    │   ├── Tồn tại & thuộc driverId này?   → 403 nếu không
    │   ├── status == STARTED?              → TRIP_NOT_AVAILABLE nếu không
    │   └── seatAvailable >= seatCount?     → SEAT_NOT_AVAILABLE nếu không đủ ghế
    │
    ├── VALIDATE GIỚI HẠN:
    │   ├── UNIQUE (tripRequestId, tripId) đã tồn tại?
    │   │   └── → INVITATION_ALREADY_SENT
    │   └── Số PENDING invitations >= MAX (5)?
    │       └── → TOO_MANY_PENDING_INVITATIONS
    │
    ├── TẠO TripRequestInvitation:
    │   ├── status = PENDING
    │   └── Lưu DB
    │
    └── BẮN Kafka: [trip-request-invited]
            │
            └──► notification-service → Push đến App Khách:
                 "Tài xế Trần Văn B (⭐4.8) mời bạn đi Hà Nội→Hà Nam,
                  14:30. Còn 3 ghế. Bấm xem & nhận chỗ!"
```

---

### LUỒNG 4 — KHÁCH CHẤP NHẬN LỜI MỜI (HAPPY PATH — Luồng phức tạp nhất)

```
[App Khách] Nhận Push → Mở màn hình lời mời → Bấm [CHẤP NHẬN]
    │
    ▼
POST /api/booking
Body: {
    tripId: "trip-uuid-456",
    seatCount: 2,
    paymentMethod: "STRIPE",
    invitationId: "inv-uuid-789"    ← THAM SỐ MỚI thêm vào
}
    │
    ▼
BookingService.createBooking(request)
    │
    ╔══ @Transactional ═══════════════════════════════════════════╗
    ║                                                              ║
    ║  BƯỚC 1 — Validate Invitation:                              ║
    ║  ├── Tồn tại?                  → 404                        ║
    ║  ├── status == PENDING?         → INVITATION_ALREADY_PROCESSED ║
    ║  └── Thuộc về customerId này?  → 403 FORBIDDEN (chống giả mạo) ║
    ║                                                              ║
    ║  BƯỚC 2 — Reserve Seats (ĐỒNG BỘ, Optimistic Lock):        ║
    ║  └── TripServiceClient.reserveSeats(tripId, seatCount)      ║
    ║       ├── OK  → Tiếp tục                                    ║
    ║       └── FAIL (ghế hết) → throw SEAT_NOT_AVAILABLE         ║
    ║                → ROLLBACK toàn bộ ← rất quan trọng          ║
    ║                                                              ║
    ║  BƯỚC 3 — Tạo Booking:                                      ║
    ║  ├── CASH   → status = WAITING_DRIVER_APPROVAL              ║
    ║  └── STRIPE → status = PENDING_PAYMENT                      ║
    ║                                                              ║
    ║  BƯỚC 4 — Cập nhật Invitation → ACCEPTED                    ║
    ║                                                              ║
    ║  BƯỚC 5 — Cập nhật TripRequest → ACCEPTED                   ║
    ║                                                              ║
    ║  BƯỚC 6 — Auto-REJECT các Invitation PENDING còn lại:       ║
    ║  ├── Query tất cả PENDING invitations khác của tripRequestId ║
    ║  ├── Cập nhật tất cả → REJECTED                             ║
    ║  └── (Bắn Kafka ngoài transaction — xem bên dưới)           ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    │
    ├── BƯỚC 7 (ASYNC — Kafka) — Auto-cancel TripRequest OPEN khác của khách:
    │   BẮN: [customer-booking-created]
    │       └──► trip-service consumer:
    │               Cancel các TripRequest OPEN khác của customerId
    │
    ├── BƯỚC 8 (ASYNC — Kafka) — Notify tài xế bị auto-reject:
    │   BẮN: [trip-request-invitation-rejected] cho từng invitation bị reject
    │       └──► notification-service → Push đến các tài xế còn lại:
    │               "Khách đã chọn tài xế khác. Cảm ơn bạn!"
    │
    └── BƯỚC 9 — BẮN Kafka: [payment-requested]
            └──► payment-service xử lý như luồng booking thông thường

══════════════════════════════════════════════════════
SAU KHI STRIPE THANH TOÁN THÀNH CÔNG:
  payment-service  → [payment-completed]
  booking-service  → status = CONFIRMED
  notification-service → Push 2 bên:
    Khách:  "Đặt chỗ thành công! Hà Nội→Hà Nam, 14:30"
    Tài xế: "Khách Nguyễn Thị A đã xác nhận 2 ghế trên chuyến của bạn"
══════════════════════════════════════════════════════
```

---

### LUỒNG 5 — KHÁCH TỪ CHỐI LỜI MỜI

```
[App Khách] Bấm [TỪ CHỐI]
    │
    ▼
POST /api/trip/requests/invitations/{invitationId}/reject
    │
    ▼
TripRequestService.rejectInvitation(invitationId)
    ├── Validate: invitation thuộc customerId + status == PENDING
    ├── Cập nhật → REJECTED
    └── BẮN Kafka: [trip-request-invitation-rejected]
            └──► notification-service → Notify tài xế:
                    "Khách đã từ chối lời mời của bạn"

[TripRequest] vẫn OPEN → Tài xế khác vẫn có thể mời tiếp
```

---

### LUỒNG 6 — KHÁCH TỰ HỦY YÊU CẦU

```
[App Khách] Bấm [HỦY YÊU CẦU]
    │
    ▼
DELETE /api/trip/requests/{requestId}
    │
    ▼
TripRequestService.cancelTripRequest(requestId)
    ├── Validate: thuộc customerId + status == OPEN
    ├── Cập nhật TripRequest → CANCELLED
    ├── Cập nhật TẤT CẢ invitation PENDING → REJECTED
    └── BẮN Kafka: [trip-request-cancelled]
            └──► notification-service → Notify tất cả tài xế đã mời:
                    "Yêu cầu Hà Nội→Hà Nam lúc 15h đã bị hủy bởi khách"
```

---

### LUỒNG 7 — TỰ ĐỘNG HẾT HẠN (SCHEDULER — Distributed Safe)

```
[Scheduler — Chạy mỗi 5 phút]
@SchedulerLock(name="TripRequestExpire", lockAtMostFor="4m", lockAtLeastFor="1m")
── Chỉ DUY NHẤT 1 instance của trip-service chạy tại 1 thời điểm ──
    │
    ▼
TripRequestExpireScheduler.run()
    │
    ├── Query: TripRequest WHERE status='OPEN' AND expires_at <= NOW()
    │
    ├── BATCH PROCESSING (xử lý từng batch 100 records):
    │   ├── Cập nhật status = EXPIRED
    │   └── Cập nhật TẤT CẢ invitation PENDING → EXPIRED
    │
    └── BẮN Kafka: [trip-request-expired] cho mỗi record
            └──► notification-service → Push cho khách:
                    "Rất tiếc, chưa có tài xế nhận chuyến của bạn
                     vào khung giờ này. Bạn có muốn đăng lại không?"
                     [Đăng lại] [Liên hệ CSKH]
```

---

### LUỒNG 8 — TÀI XẾ TẠO CHUYẾN TỪ BỘ LỌC

```
[App Tài Xế] Lọc thấy nhiều khách muốn đi cùng tuyến
    │   Bấm [TẠO CHUYẾN TỪ BỘ LỌC NÀY]
    │
    ▼
App tự điền sẵn form:
    ├── Tỉnh đi:  từ filter startProvinceId
    ├── Tỉnh đến: từ filter endProvinceId
    └── Giờ gợi ý: phổ biến nhất trong desiredDepartureTime của danh sách

Tài xế điền thêm:
    ├── departureTime chính thức
    ├── priceVnd (giá/ghế)
    ├── seatTotal
    └── approvalMode: AUTO_ACCEPT hoặc MANUAL_APPROVAL

Bấm [XÁC NHẬN TẠO CHUYẾN]
    │
    ▼
POST /api/trip  ← Dùng lại API createTrip hiện có
    │
    └── Sau khi tạo Trip thành công:
        Tài xế quay lại Chợ → dùng LUỒNG 3 để mời từng khách yêu thích
```

---

## 🗺️ 5. KAFKA TOPIC MAP — TẤT CẢ EVENTS MỚI

| Topic | Producer | Consumer | Mục đích |
|---|---|---|---|
| `trip-request-created` | trip-service | notification-service | Khách đăng yêu cầu → Push tài xế tuyến đó |
| `trip-request-invited` | trip-service | notification-service | Tài xế mời → Push khách |
| `trip-request-invitation-rejected` | trip-service / booking-service | notification-service | Lời mời bị từ chối / auto-reject |
| `trip-request-expired` | trip-service (scheduler) | notification-service | Hết hạn → Push khách |
| `trip-request-cancelled` | trip-service | notification-service | Khách tự hủy → Push tài xế đã mời |
| `customer-booking-created` | booking-service | trip-service | Khách đã book → Auto-cancel TripRequest OPEN khác |

---

## 🛡️ 6. EDGE CASES MATRIX — XỬ LÝ TÌNH HUỐNG NGOẠI LỆ

| Tình huống | Cơ chế xử lý |
|---|---|
| 3 tài xế cùng mời 1 khách | `UNIQUE CONSTRAINT (tripRequestId, tripId)` + giới hạn `MAX_PENDING = 5` |
| Khách accept nhưng ghế đã hết (race condition) | `@Version` Optimistic Lock + Validate lúc accept → `SEAT_NOT_AVAILABLE` → ROLLBACK |
| Khách có nhiều lời mời PENDING, accept 1 | Auto-REJECT tất cả còn lại trong cùng `@Transactional` |
| Khách tự book xe sau khi đã đăng TripRequest | Bắn `customer-booking-created` → trip-service consumer auto-cancel |
| Scheduler chạy trên nhiều instance (scale out) | `ShedLock` đảm bảo chỉ 1 instance xử lý tại 1 thời điểm |
| TripRequest hết hạn khi đang có PENDING invitation | Expire cả 2: TripRequest + tất cả invitation PENDING |
| Tài xế bấm mời nhưng TripRequest vừa hết hạn | Check `expiresAt > NOW()` trong validate → `TRIP_REQUEST_EXPIRED` |
| Tài xế cancel Trip sau khi đã gửi invitation | Bắn event → auto-REJECT invitation → notify khách |

---

## 📊 7. STATE MACHINE

### TripRequest

```
                          ┌─────────┐
                          │  OPEN   │ ◄── Trạng thái khởi tạo
                          └────┬────┘
               ┌───────────────┼────────────────┐
               │               │                │
               ▼               ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────────┐
        │ ACCEPTED │    │ EXPIRED  │    │  CANCELLED   │
        │(Đã ghép) │    │(Hết hạn) │    │(Khách/Auto)  │
        └──────────┘    └──────────┘    └──────────────┘
```

### TripRequestInvitation

```
                     ┌─────────┐
                     │ PENDING │ ◄── Tài xế vừa gửi lời mời
                     └────┬────┘
            ┌─────────────┼──────────────┐
            │             │              │
            ▼             ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ ACCEPTED │  │ REJECTED │  │ EXPIRED  │
      │(Khách OK)│  │(Từ chối/ │  │(TripReq  │
      │          │  │Auto-rej) │  │ expired) │
      └──────────┘  └──────────┘  └──────────┘
```

---

## 🔑 8. TECHNICAL HIGHLIGHTS — ĐIỂM KỸ THUẬT THEN CHỐT

### 1. Tính Atomicity của Luồng 4 (Accept)
Bước 2 → 3 → 4 → 5 → 6 nằm trong **CÙNG MỘT `@Transactional`**.  
Nếu bất kỳ bước nào lỗi → **ROLLBACK toàn bộ** → Không bao giờ xảy ra:
- Ghế bị trừ nhưng Invitation không được update
- Booking được tạo nhưng TripRequest vẫn còn OPEN

### 2. Optimistic Lock trên TripRequest
```java
@Version
private Long version; // JPA tự tăng mỗi lần update
// Nếu 2 luồng đọc cùng version rồi cùng update → OptimisticLockException
// → Luồng đến sau phải retry hoặc báo lỗi gracefully
```

### 3. Async cho Non-critical Operations
- **Bước 7** (Auto-cancel TripRequest khác) → Kafka `ASYNC` (không block transaction chính)
- **Bước 8** (Notify tài xế bị auto-reject) → Kafka `ASYNC`
- **KHÔNG** dùng Feign đồng bộ vì nếu notification-service chết → booking bị rollback oan

### 4. ShedLock cho Distributed Scheduler
```java
@Scheduled(fixedDelay = 300_000) // 5 phút
@SchedulerLock(
    name = "TripRequestExpireScheduler",
    lockAtMostFor = "4m",   // Release lock sau 4 phút dù job vẫn chạy
    lockAtLeastFor = "1m"   // Giữ lock ít nhất 1 phút (tránh chạy lại quá nhanh)
)
public void expireTripRequests() { ... }
```

### 5. Privacy cho Marketplace API
Trước khi confirm, **KHÔNG** trả thông tin nhạy cảm của khách (số điện thoại, địa chỉ nhà).  
Chỉ trả: `fullName`, `avatarUrl`, `seatCount`, `note`.  
Sau khi booking `CONFIRMED` → tài xế mới thấy số điện thoại qua Booking detail.

---

## 🗓️ 9. KẾ HOẠCH TRIỂN KHAI (Recommended Order)

| Bước | Nội dung | Service |
|---|---|---|
| 1 | Bổ sung `operatingProvinceIds` vào `DriverProfile` + API update | `identity-service` |
| 2 | Tạo Entity `TripRequest`, `TripRequestInvitation`, Repository, Enum | `trip-service` |
| 3 | API Marketplace: Create, Get list, Cancel TripRequest | `trip-service` |
| 4 | API Invite: Gửi lời mời, Từ chối lời mời | `trip-service` |
| 5 | Scheduler expire + ShedLock | `trip-service` |
| 6 | Cập nhật `BookingService.createBooking()` xử lý `invitationId` | `booking-service` |
| 7 | Kafka consumer xử lý `customer-booking-created` → auto-cancel | `trip-service` |
| 8 | Kafka consumers cho Push Notification (6 topics mới) | `notification-service` |
