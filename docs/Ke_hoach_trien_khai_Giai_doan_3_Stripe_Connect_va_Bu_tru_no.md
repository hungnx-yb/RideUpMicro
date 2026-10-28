# 📋 BÁO CÁO NGHIỆP VỤ & KẾ HOẠCH TRIỂN KHAI CHI TIẾT — GIAI ĐOẠN 3
# HỆ THỐNG DÒNG TIỀN TRUNG GIAN STRIPE CONNECT & TỰ ĐỘNG BÙ TRỪ NỢ TIỀN MẶT (TRỌNG TÂM ĐỒ ÁN)

> **Dự án:** RideUpMicro | **Module phụ trách chính:** `payment-service`, `identity-service`, `booking-service`, `trip-service`  
> **Tài liệu tham chiếu:** REQ-P3-04, REQ-P3-05, REQ-P3-06 trong `Cải tiến phase 3.md`  
> **Môi trường thực thi:** **Stripe Test Mode** (`sk_test_...`) phục vụ thực nghiệm và bảo vệ đồ án tốt nghiệp.  
> **Tiêu chí tối cao:** Làm rõ toàn diện từng bước thao tác của Tài xế khi cấu hình kết nối Stripe, tối giản cấu hình hệ thống, bảo vệ an toàn CSDL, không lỗi hiển thị ký tự.

---

## 📌 PHẦN 1: BỐI CẢNH & VẤN ĐỀ BAN ĐẦU (TẠI SAO ĐÂY LÀ TRỌNG TÂM ĐỒ ÁN?)

### 1.1. Hiện trạng hệ thống (As-Is)
Trong mô hình xe ghép liên tỉnh (Carpooling), các chuyến xe có hình thức thanh toán hỗn hợp:
* **Khách thanh toán Tiền mặt (`CASH`):** Chiếm khoảng 50% - 60% thị phần. Khách lên xe trả tiền mặt trực tiếp cho tài xế -> Sàn không giữ tiền cuốc này -> Sàn chỉ ghi nhận nợ hoa hồng vào `systemDebt`.
* **Khách thanh toán Thẻ trực tuyến (`STRIPE`):** Tiền được ủy quyền tạm giữ từ thẻ của khách vào tài khoản ví trung gian của Sàn (Platform Escrow).

### 1.2. Bốn bài toán nan giải trong thực tế
1. **Tiền kẹt tại sàn, kế toán phải chuyển khoản thủ công:** Khi cuốc xe Stripe hoàn tất, hệ thống chỉ capture tiền về ví sàn. Sàn chưa có cơ chế tự động giải ngân thu nhập về tài khoản ngân hàng của tài xế. Kế toán phải rà soát sao kê và chuyển khoản ngân hàng thủ công từng chuyến -> Tốn nhân lực, chậm trễ, dễ nhầm lẫn.
2. **Không thể lưu trữ số tài khoản ngân hàng của tài xế trên máy chủ:** Sàn không được phép lưu số thẻ ATM hay tài khoản ngân hàng trực tiếp trong CSDL vì vi phạm chuẩn an ninh quốc tế PCI-DSS và có rủi ro bị kẻ gian hack sửa đổi số tài khoản nhận tiền.
3. **Nợ xấu tiền mặt phình to:** Tài xế chạy cuốc tiền mặt, cầm 100% tiền vé nhưng không nộp lại hoa hồng cho sàn. Nếu nợ tích lũy lên tiền triệu rồi tài xế bỏ ứng dụng -> Sàn mất trắng doanh thu hoa hồng.
4. **Thiếu cơ chế bù trừ nợ chéo (Cross-Debt Offset):** Tài xế vừa nợ sàn hoa hồng tiền mặt từ chuyến trước, vừa có thu nhập cuốc Stripe ở chuyến sau. Hệ thống chưa có cơ chế tự động cấn trừ hai khoản này với nhau.

---

## 💳 PHẦN 2: CHI TIẾT NGHIỆP VỤ TÀI XẾ CẤU HÌNH & KẾT NỐI STRIPE CONNECT (REQ-P3-04)

Đây là mắt xích quan trọng nhất để mở khóa toàn bộ dòng tiền online. Hệ thống ứng dụng kiến trúc **Stripe Connect Express Hosted Flow**.

### 2.1. Vòng đời Trạng thái Tài khoản Stripe của Tài xế (State Machine)

```text
[Tài xế mới duyệt hồ sơ]
          │
          ▼
   (NOT_CONNECTED)  <--- Khách đặt xe CHỈ THẤY TIỀN MẶT, tùy chọn Stripe bị khóa
          │
          │ Bấm "Liên kết tài khoản nhận tiền"
          ▼
(PENDING_VERIFICATION) <--- Đang mở form hoặc đang điền trên Stripe
          │
          ├─ Stripe Webhook báo payouts_enabled = true
          ▼
      (ACTIVE)      <--- MỞ KHÓA THANH TOÁN STRIPE CHO KHÁCH HÀNG!
          │              Thu nhập tự động chuyển về thẻ ngân hàng
          │
          ├─ Stripe yêu cầu cập nhật giấy tờ (Edge case)
          ▼
    (RESTRICTED)    <--- Tạm khóa nhận cuốc Stripe mới
```

* **Ý nghĩa từng trạng thái:**
  * `NOT_CONNECTED`: Tài xế chưa từng bấm liên kết. Bảng `driver_profile` có `stripe_account_id = NULL`.
  * `PENDING_VERIFICATION`: Đã tạo tài khoản Stripe Express (`acct_xxx`) nhưng tài xế chưa hoàn tất điền form.
  * `ACTIVE`: Tài xế đã hoàn tất khai báo, Stripe đã xác minh thành công (`payouts_enabled = true` và `details_submitted = true`). Sàn mở khóa lựa chọn Stripe cho mọi khách đặt xe với tài xế này.
  * `RESTRICTED`: Tài khoản bị Stripe yêu cầu cập nhật thông tin bổ sung.

---

### 2.2. Chi tiết 7 bước tương tác từ Giao diện Driver App đến Stripe

```text
Tài xế (Driver App)        Backend (payment-service)            Stripe Connect
        │                              │                              │
 1. Bấm [Liên kết Stripe]              │                              │
        │─── POST /onboard-link ──────>│                              │
        │                              │─── 2. Account.create() ─────>│ (nếu chưa có acct)
        │                              │<── Trả về stripeAccountId ───│ (acct_1Ozxxx)
        │                              │                              │
        │                              │─── 3. AccountLink.create() ─>│ (type: account_onboarding)
        │                              │<── Trả về onboardUrl ────────│ (link hiệu lực 5 phút)
        │<── Trả về { onboardUrl } ────│                              │
        │                              │                              │
 4. Mở In-App Webview (Stripe Form)    │                              │
        │────────────────────────────────────────────────────────────>│
 5. [ĐỒ ÁN TEST MODE]:                 │                              │
    Bấm "Skip this account form"       │                              │
    (Hoặc điền SĐT Test 000-000-0000)  │                              │
        │                              │                              │
        │                              │<── 6. Webhook: account.upd ──│ (payouts_enabled=true)
        │                              │    (Cập nhật status=ACTIVE)  │
        │<── 7. Redirect về return_url ───────────────────────────────│
        │    (rideup://driver/stripe-return)                          │
 8. Driver App Active Polling:         │                              │
    GET /account-status                │                              │
    ➜ Hiển thị Badge: 🟢 ĐÃ LIÊN KẾT   │                              │
```

#### Chi tiết hành vi tại từng bước:
1. **Bước 1 - Khởi tạo trên Driver App:**
   * Tài xế vào màn hình **"Ví của tôi"**.
   * Nếu trạng thái là `NOT_CONNECTED`: Hiển thị Banner hướng dẫn: *"Liên kết tài khoản nhận tiền để mở khóa thanh toán trực tuyến qua Stripe cho hành khách."*
   * Nút bấm: `[🚀 THIẾT LẬP TÀI KHOẢN NHẬN TIỀN (STRIPE)]`.
   * Khi bấm nút, App gọi API: `POST /api/v1/payments/stripe/driver/onboard-link`.

2. **Bước 2 - Backend khởi tạo Connected Account:**
   * `payment-service` kiểm tra trong `identity-service` xem tài xế đã có `stripe_account_id` chưa.
   * Nếu chưa: Gọi Stripe SDK tạo tài khoản mới:
     ```java
     AccountCreateParams params = AccountCreateParams.builder()
             .setType(AccountCreateParams.Type.EXPRESS)
             .setCountry("VN")
             .setCapabilities(AccountCreateParams.Capabilities.builder()
                     .setTransfers(AccountCreateParams.Capabilities.Transfers.builder()
                             .setRequested(true)
                             .build())
                     .build())
             .build();
     Account account = Account.create(params);
     ```
   * Lưu mã `account.getId()` (dạng `acct_xxxxxxxxxx`) vào `DriverProfile` với trạng thái `PENDING_VERIFICATION`.

3. **Bước 3 - Sinh Onboard Link an toàn:**
   * Backend gọi Stripe API sinh đường link điều hướng:
     ```java
     AccountLinkCreateParams linkParams = AccountLinkCreateParams.builder()
             .setAccount(stripeAccountId)
             .setRefreshUrl("rideup://driver/stripe-refresh")
             .setReturnUrl("rideup://driver/stripe-return")
             .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
             .build();
     AccountLink accountLink = AccountLink.create(linkParams);
     ```
   * Trả về đường dẫn `onboardUrl` có thời hạn bảo mật **5 phút**.

4. **Bước 4 - Mở giao diện định danh Stripe:**
   * Driver App mở đường dẫn bằng In-App Browser (Chrome Custom Tabs trên Android hoặc Safari View Controller trên iOS).

5. **Bước 5 - Thao tác cực nhanh trong ĐỒ ÁN (STRIPE TEST MODE):**
   * Vì đây là môi trường thử nghiệm đồ án (`sk_test_...`):
     * Giao diện của Stripe hiển thị thanh công cụ kiểm thử: **"Test Mode - Use test data or skip"**.
     * Giảng viên hoặc sinh viên chỉ cần bấm nút **[Skip this account form]** (Bỏ qua biểu mẫu).
     * Ngay lập tức Stripe tự động điền dữ liệu mẫu hợp lệ và kích hoạt tài khoản sang trạng thái `ACTIVE` mà **không cần nộp CCCD thật hay số tài khoản ngân hàng thật**!
     * *(Nếu muốn điền form test: Nhập số điện thoại test `000-000-0000`, mã OTP SMS `000000`, chọn ngân hàng test).*

6. **Bước 6 - Đồng bộ tự động 2 kênh (Webhook & Active Polling):**
   * *Kênh Webhook (Chính thống):* Máy chủ Stripe gửi sự kiện `account.updated` về `POST /api/v1/payments/webhook/stripe`. Backend kiểm tra `payouts_enabled == true` -> Gọi `identity-service` cập nhật `DriverProfile`:
     * `stripe_account_status = ACTIVE`
     * `stripe_payouts_enabled = true`
   * *Kênh Redirect (Trải nghiệm tức thì):* Stripe chuyển hướng người dùng về `return_url`. App bắt sự kiện deep link và gọi ngay `GET /api/v1/payments/stripe/driver/account-status` để chuyển ngay giao diện sang Badge xanh: **"🟢 Đã liên kết tài khoản nhận tiền"**.

7. **Bước 7 - Mở khóa thanh toán Stripe cho khách hàng:**
   * Khi tài xế đã `ACTIVE`, bất kỳ hành khách nào đặt chuyến xe của tài xế này đều sẽ nhìn thấy tùy chọn thanh toán thẻ trực tuyến qua Stripe!

---

### 2.3. Tài xế quản lý tài khoản & Rút tiền (Stripe Express Dashboard Link)
Sau khi đã liên kết thành công (`ACTIVE`), tài xế có toàn quyền quản lý tài khoản ngân hàng của mình mà Sàn không cần can thiệp:
* Trên Driver App xuất hiện nút: `[⚙️ Quản lý thẻ nhận tiền trên Stripe Express Portal]`.
* Khi tài xế bấm vào -> App gọi `POST /api/v1/payments/stripe/driver/dashboard-link`.
* Backend gọi Stripe API:
  ```java
  LoginLink loginLink = LoginLink.createOnAccount(stripeAccountId, LoginLinkCreateParams.builder().build(), null);
  ```
* Stripe trả về link đăng nhập 1 lần (`loginUrl`, hiệu lực 15 phút) đưa tài xế sang cổng quản trị chính thức của Stripe để:
  * Xem sao kê các khoản tiền sàn đã chuyển vào.
  * Tự thay đổi số tài khoản ngân hàng nhận tiền mới (Stripe tự gửi OTP 2 lớp về SMS của tài xế).
  * Xem tiến độ Stripe chuyển tiền về thẻ ATM cá nhân.

---

## ⚡ PHẦN 3: CƠ CHẾ CHIA TIỀN TỰ ĐỘNG & BÙ TRỪ NỢ TIỀN MẶT (REQ-P3-05)

### 3.1. Hạch toán độc lập theo từng Booking (Per-Booking Settlement)
Trong xe ghép liên tỉnh, mỗi khách xuống xe ở một điểm dừng và trả tiền bằng các hình thức khác nhau. Hệ thống hạch toán ngay khi tài xế bấm **"Trả khách / Hoàn tất vé"** cho từng booking:

```text
[Tài xế bấm Hoàn tất vé] -> BookingCompletedEvent
                                │
               Phương thức thanh toán là gì?
                /                             \
        [CASH: Tiền mặt]               [STRIPE: Thẻ trực tuyến]
               │                                   │
   1. Khách đưa tiền mặt cho tài xế    1. Sàn gọi PaymentIntent.capture()
   2. Sàn KHÔNG giữ tiền cuốc này         rút tiền vé từ thẻ khách về ví sàn.
   3. Ghi nhận nợ hoa hồng:            2. Lấy R_final từ CommissionService
      systemDebt += commissionAmount   3. Tính toán:
      (Không gọi Stripe Transfer)         - commissionAmount = totalFare * R_final
                                          - netDriverIncome  = totalFare - commission
                                       4. Áp dụng Thuật toán Bù trừ nợ 3 trường hợp
```

---

### 3.2. Thuật toán Bù trừ nợ 3 trường hợp chi tiết

```text
Đầu vào:
  - totalFare: Tiền vé cuốc xe (BigDecimal)
  - appliedRate: Tỷ lệ hoa hồng tài xế (BigDecimal, từ Giai đoạn 2: 12% - 25%)
  - systemDebt: Dư nợ tiền mặt hiện tại của tài xế (BigDecimal, >= 0)

Tính toán cơ bản:
  commissionAmount = totalFare * appliedRate;
  netDriverIncome  = totalFare - commissionAmount;

Xử lý 3 trường hợp:
├─ Trường hợp 1: Tài xế KHÔNG có nợ (systemDebt <= 0):
│  • debtDeducted = 0 đ
│  • finalTransfer = netDriverIncome
│  • Hành động: Gọi Stripe Transfer.create(amount = finalTransfer, destination = stripeAccountId)
│  • Ghi sổ cái: status = COMPLETED, final_payout_amount = finalTransfer
│
├─ Trường hợp 2: Có nợ nhưng nợ NHỎ HƠN thu nhập cuốc này (0 < systemDebt < netDriverIncome):
│  • debtDeducted = systemDebt
│  • finalTransfer = netDriverIncome - debtDeducted
│  • Hành động: 
│    1. Gọi Stripe Transfer.create(amount = finalTransfer, destination = stripeAccountId)
│    2. Cấn trừ nợ: Gọi identity-service xóa nợ về 0 đ
│  • Ghi sổ cái: status = COMPLETED, debt_deducted_amount = debtDeducted, final_payout_amount = finalTransfer
│  • Tự động mở khóa tạo chuyến nếu tài xế đang bị khóa do nợ!
│
└─ Trường hợp 3: Nợ LỚN HƠN HOẶC BẰNG thu nhập cuốc này (systemDebt >= netDriverIncome):
   • debtDeducted = netDriverIncome
   • finalTransfer = 0 đ
   • newDebt = systemDebt - netDriverIncome
   • Hành động:
     1. TUYỆT ĐỐI KHÔNG gọi Stripe Transfer (vì Stripe API ném lỗi nếu amount <= 0)
     2. Cấn trừ nợ: Gọi identity-service giảm nợ còn newDebt
   • Ghi sổ cái: status = FULL_DEBT_OFFSET, stripe_transfer_id = "N/A_FULL_OFFSET", final_payout_amount = 0 đ
```

---

### 3.3. Bảng mô phỏng hành trình xe ghép 3 khách (Minh họa trực quan)
*Tài xế có tỷ lệ hoa hồng 15%, khởi đầu nợ 0 đ:*

| Khách | Vé & Hình thức | Giá vé | Hoa hồng (15%) | Dòng tiền thực tế & Xử lý | Nợ ví (`systemDebt`) | Tiền chuyển vào Stripe |
| :---: | :---: | :---: | :---: | :--- | :---: | :---: |
| **Khách 1** | `BK-01` (STRIPE) | 200.000 đ | 30.000 đ | Thu nhập sạch: 170.000 đ. Không nợ cũ. | **0 đ** | **170.000 đ** |
| **Khách 2** | `BK-02` (CASH) | 300.000 đ | 45.000 đ | Khách trả 300k tiền mặt. Nợ hoa hồng sàn 45k. Không gọi Stripe. | **45.000 đ** *(Nợ)* | **0 đ** *(Khách trả tiền mặt)* |
| **Khách 3** | `BK-03` (STRIPE) | 200.000 đ | 30.000 đ | Thu nhập: 170.000 đ. Cấn trừ sạch 45.000 đ nợ cũ -> Sạch nợ! | **0 đ** *(Hết nợ)* | **125.000 đ** *(170k - 45k)* |

-> **Tổng kết:** Tài xế nhận đủ 300.000 đ tiền mặt + 295.000 đ Stripe = 595.000 đ. Sàn thu đủ 105.000 đ tiền hoa hồng. Không thất thoát nợ!

---

## 🛑 PHẦN 4: KIỂM SOÁT HẠN MỨC NỢ (CREDIT LIMIT 500K) & TỰ ĐỘNG MỞ KHÓA (REQ-P3-06)

1. **Ngưỡng kiểm soát:** Mặc định `CREDIT_LIMIT = 500.000 đ`.
2. **Kiểm tra khi Tạo chuyến (`POST /trips`):**
   * `trip-service` gọi `identity-service` kiểm tra `systemDebt`.
   * Nếu `systemDebt >= 500.000 đ` -> Từ chối tạo chuyến với mã lỗi `ACCOUNT_BLOCKED_DUE_TO_DEBT`. App hiển thị cảnh báo đỏ yêu cầu trả nợ.
3. **Cơ chế tự động mở khóa 2 luồng:**
   * *Luồng nạp tiền chủ động:* Tài xế bấm "Thanh toán nợ" -> Hệ thống tạo Stripe PaymentIntent với `amount = systemDebt` -> Tài xế quét thẻ trả nợ -> `systemDebt` xóa về 0 đ -> Mở khóa tức thì.
   * *Luồng bù trừ tự động:* Khi tài xế hoàn thành các cuốc xe Stripe, thu nhập tự động trừ dần nợ cũ. Khi nợ giảm xuống dưới 500.000 đ -> Hệ thống tự động gỡ cờ chặn mà không cần Admin can thiệp.

---

## 🗄️ PHẦN 5: THIẾT KẾ CƠ SỞ DỮ LIỆU TỐI GIẢN

### 5.1. Bảng `driver_profile` (tại `identity-service`) — Bổ sung 3 trường Stripe
```sql
ALTER TABLE driver_profile 
    ADD COLUMN stripe_account_id VARCHAR(100) NULL UNIQUE COMMENT 'Mã tài khoản Stripe Connect (acct_xxx)',
    ADD COLUMN stripe_account_status VARCHAR(30) NOT NULL DEFAULT 'NOT_CONNECTED' COMMENT 'NOT_CONNECTED, PENDING_VERIFICATION, ACTIVE, RESTRICTED',
    ADD COLUMN stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Cờ xác nhận tài khoản đã đủ điều kiện nhận tiền về thẻ ATM';
```

### 5.2. Bảng Sổ cái `driver_payout_transactions` (tại `payment-service`)
```sql
CREATE TABLE IF NOT EXISTS driver_payout_transactions (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL UNIQUE COMMENT 'Khóa chống chia tiền trùng lặp cho một booking (Idempotency)',
    driver_id VARCHAR(36) NOT NULL,
    total_fare DECIMAL(12, 2) NOT NULL COMMENT 'Tổng tiền vé cuốc xe',
    commission_rate DECIMAL(5, 4) NOT NULL COMMENT 'Tỷ lệ hoa hồng áp dụng',
    commission_amount DECIMAL(12, 2) NOT NULL COMMENT 'Số tiền hoa hồng sàn thu',
    debt_deducted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Số tiền nợ cũ cấn trừ trong cuốc này',
    final_payout_amount DECIMAL(12, 2) NOT NULL COMMENT 'Số tiền thực chuyển vào Stripe tài xế',
    stripe_transfer_id VARCHAR(100) NULL COMMENT 'Mã transfer từ Stripe (tr_xxx) hoặc N/A_FULL_OFFSET',
    status VARCHAR(30) NOT NULL COMMENT 'COMPLETED, FULL_DEBT_OFFSET, FAILED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_driver_payout (driver_id, created_at DESC)
);
```

### 5.3. Lưu ý quy ước tiền tệ VNĐ trong Stripe (Zero-Decimal Currency)
* Tiền tệ `vnd` trong Stripe API là loại tiền **không có số thập phân**.
* Ví dụ vé 200.000 VNĐ -> gửi đúng `amount = 200000L` (tuyệt đối không nhân 100).

---

## 🔌 PHẦN 6: DANH MỤC API CONTRACTS

### 6.1. Nhóm API Tài xế & Stripe Connect (`payment-service`)
1. `POST /api/v1/payments/stripe/driver/onboard-link`: Sinh link Onboard (5 phút).
2. `GET /api/v1/payments/stripe/driver/account-status`: Kiểm tra trạng thái liên kết (`ACTIVE`, `payoutsEnabled`).
3. `POST /api/v1/payments/stripe/driver/dashboard-link`: Sinh link đăng nhập Stripe Express Portal.
4. `POST /api/v1/payments/webhook/stripe`: Tiếp nhận Webhook `account.updated` từ Stripe.
5. `GET /api/v1/payments/driver/payouts`: Lịch sử nhận tiền và cấn trừ nợ của tài xế.

### 6.2. Nhóm API Khách hàng & Kiểm tra Chuyến đi
1. `GET /api/v1/trips/{tripId}/payment-options`: Kiểm tra xem chuyến xe có mở tùy chọn Stripe không (tùy thuộc tài xế đã `ACTIVE` hay chưa).
2. `POST /api/v1/trips`: `trip-service` chặn tạo chuyến nếu tài xế nợ `systemDebt >= 500.000 đ`.

---

## 📋 PHẦN 7: KẾ HOẠCH TRIỂN KHAI 6 BƯỚC TUẦN TỰ

| Bước | Module | Nhiệm vụ kỹ thuật chi tiết | File can thiệp chính |
| :---: | :--- | :--- | :--- |
| **B1** | `identity-service` | Bổ sung 3 trường Stripe vào `DriverProfile` và viết endpoint nội bộ cập nhật trạng thái Stripe | `DriverProfile.java`<br>`DriverController.java` |
| **B2** | `payment-service` | Triển khai Stripe Express Onboarding Service, sinh Onboard Link và xử lý Webhook `account.updated` | `StripeConnectService.java`<br>`StripeWebhookController.java` |
| **B3** | `payment-service` | Tạo Entity & Repository Sổ cái `DriverPayoutTransaction` | `entity/DriverPayoutTransaction.java`<br>`repository/...` |
| **B4** | `payment-service` | Viết `PayoutService`: Tính thu nhập ròng, thuật toán cấn trừ nợ 3 trường hợp và gọi Stripe `Transfer.create()` | `service/PayoutService.java` |
| **B5** | `payment-service` | Tích hợp vào `PaymentServiceConsumer` khi nhận sự kiện `booking-completed` cuốc Stripe | `kafka/consumer/PaymentServiceConsumer.java` |
| **B6** | `booking-service` & `trip-service` | Chặn khách chọn Stripe khi tài xế chưa ACTIVE; chặn tạo chuyến khi nợ vượt 500k | `TripService.java`<br>`BookingService.java` |

---

## 🧪 PHẦN 8: KỊCH BẢN DEMO BẢO VỆ ĐỒ ÁN TRƯỚC HỘI ĐỒNG

1. **Demo 1 - Ràng buộc Onboard:** 
   * Tài xế A chưa liên kết Stripe -> Khách hàng vào đặt chuyến của tài xế A chỉ thấy nút Tiền mặt, nút Stripe bị mờ/khóa.
2. **Demo 2 - Thao tác Onboard siêu tốc:**
   * Tài xế A vào app bấm "Liên kết Stripe" -> Sang giao diện Stripe Test bấm "Skip this account form" -> Hệ thống cập nhật `ACTIVE` -> Khách đặt xe lập tức được mở khóa nút Stripe!
3. **Demo 3 - Bù trừ nợ tự động trực quan:**
   * Tạo 1 cuốc Tiền mặt 300k -> Tài xế nhận nợ hoa hồng 45k trên app.
   * Tạo 1 cuốc Stripe Test 200k (dùng thẻ test 4242...) -> Khi hoàn thành, hệ thống tự động trừ 45k nợ cũ, nợ về 0 đ, Stripe Transfer chuyển 125k vào tài khoản Stripe tài xế. Mở Stripe Dashboard cho hội đồng xem lệnh chuyển tiền thực tế!
4. **Demo 4 - Kiểm soát hạn mức nợ 500k:**
   * Cố tình để tài xế nợ tiền mặt vượt 500k -> Bấm tạo chuyến bị báo lỗi đỏ -> Nạp tiền trả nợ -> Mở khóa tức thì.
