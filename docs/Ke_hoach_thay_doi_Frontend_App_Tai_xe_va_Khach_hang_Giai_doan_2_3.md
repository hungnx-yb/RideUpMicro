# 📱 KẾ HOẠCH THAY ĐỔI FRONTEND (APP TÀI XẾ & KHÁCH HÀNG)
## GIAI ĐOẠN 2 (HOA HỒNG & ĐIỂM UY TÍN) VÀ GIAI ĐOẠN 3 (STRIPE CONNECT & BÙ TRỪ NỢ)

> **Tài liệu bàn giao cho Đội ngũ Frontend (Mobile App Flutter/React Native & Web Admin)**  
> **Người lập:** Senior Backend & Solution Architect (SA)  
> **Phiên bản:** 1.0 - RideUp Microservices Platform  

---

## 📌 I. TỔNG QUAN PHẠM VI ẢNH HƯỞNG FRONTEND

Khi triển khai thành công Backend của **Giai đoạn 2** (Điểm uy tín, hoa hồng động 12% - 25%) và **Giai đoạn 3** (Dòng tiền Stripe Connect Express, bù trừ nợ 3 trường hợp, kiểm soát thanh toán theo tài xế), giao diện người dùng (UI/UX) của **App Tài xế (Driver App)**, **App Khách hàng (Passenger App)** và **Admin Dashboard** sẽ có các thay đổi nghiệp vụ cụ thể sau:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PHẠM VI THAY ĐỔI UI/UX                           │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│    DRIVER APP (TÀI XẾ)   │ PASSENGER APP (HÀNH KHÁCH)│ ADMIN DASHBOARD (WEB) │
├──────────────────────────┼──────────────────────────┼───────────────────────┤
│ 1. Badge Điểm uy tín     │ 1. Tự động ẩn/hiện nút   │ 1. Quản lý cấu hình   │
│    và % Chiết khấu       │    thanh toán Stripe     │    hoa hồng sàn       │
│ 2. Khối kết nối Stripe   │ 2. Thanh toán thẻ online │ 2. Giám sát sổ cái    │
│    Connect Express       │    an toàn (Hold tiền)   │    công nợ tài xế     │
│ 3. Nút Express Dashboard │ 3. Đánh giá 5 sao        │ 3. Tra cứu lịch sử    │
│    (Đổi thẻ ATM, sao kê) │    tặng điểm uy tín      │    giải ngân Stripe   │
│ 4. Minh bạch bù trừ nợ   │                          │                       │
│ 5. Chặn tạo chuyến khi nợ│                          │                       │
└──────────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 🚗 II. CHI TIẾT THAY ĐỔI TRÊN DRIVER APP (ỨNG DỤNG TÀI XẾ)

### 1. Màn hình "Ví & Tài chính" (Wallet & Financial Hub)
Đây là màn hình thay đổi nhiều nhất, trở thành trung tâm quản lý dòng tiền của tài xế.

#### 🎨 Phác thảo Giao diện (UI Wireframe):
```text
┌─────────────────────────────────────────────────────────┐
│ [←]                  VÍ & TÀI CHÍNH                     │
├─────────────────────────────────────────────────────────┤
│ 🛡️ HẠNG UY TÍN TÀI XẾ                                   │
│   Điểm uy tín: 85 / 100 [Vàng]                          │
│   ████████████████████░░░░░░ (85%)                      │
│   Chiết khấu hoa hồng hiện tại: 15.0% (Gốc: 18.0%)      │
│   ✨ Bạn đang được GIẢM 3.0% hoa hồng nhờ uy tín tốt!   │
├─────────────────────────────────────────────────────────┤
│ 💳 TÀI KHOẢN NHẬN TIỀN TRỰC TUYẾN (STRIPE CONNECT)      │
│                                                         │
│   [TRƯỜNG HỢP A: CHƯA LIÊN KẾT]                         │
│   ⚠️ Chưa liên kết tài khoản ngân hàng nhận tiền        │
│   [ 🔗 Liên kết tài khoản ngân hàng Stripe Express ]    │
│                                                         │
│   [TRƯỜNG HỢP B: ĐÃ LIÊN KẾT THÀNH CÔNG]                │
│   🟢 Trạng thái: Đã kích hoạt nhận tiền tự động         │
│   Mã tài khoản: acct_1P9xyz...                          │
│   [ ⚙️ Quản lý thẻ ATM / Rút tiền trên Stripe Portal ]  │
├─────────────────────────────────────────────────────────┤
│ 📑 CÔNG NỢ HOA HỒNG TIỀN MẶT                            │
│   Dư nợ hiện tại: 45.000 đ                              │
│   Hạn mức nợ cho phép: 500.000 đ                        │
│   ██░░░░░░░░░░░░░░░░░░░░░░ (45k / 500k)                 │
│   💡 Nợ sẽ được tự động cấn trừ khi có cuốc khách trả thẻ│
│   [ 💳 Nạp tiền trả nợ ngay qua thẻ ]                   │
├─────────────────────────────────────────────────────────┤
│ 📜 LỊCH SỬ NHẬN TIỀN & ĐỐI SOÁT CUỐC XE                 │
│   • BK-03: Nhận 125.000 đ (Đã trừ nợ 45.000 đ)  [Xem]  │
│   • BK-02: Tiền mặt 300.000 đ (Ghi nợ 45.000 đ)  [Xem]  │
│   • BK-01: Nhận 170.000 đ                        [Xem]  │
└─────────────────────────────────────────────────────────┘
```

#### 🔌 Tích hợp API tương ứng:

1. **Lấy điểm uy tín & tỷ lệ hoa hồng:**
   * **API:** `GET /api/identity/drivers/me/reputation`
   * **Response:**
     ```json
     {
       "result": {
         "driverId": "usr_driver_01",
         "reputationScore": 85,
         "baseRate": 0.18,
         "effectiveRate": 0.15,
         "discount": 0.03
       }
     }
     ```
   * **UX/Interaction:** Hiển thị thanh tiến trình điểm (màu xanh lá nếu >= 80, vàng nếu 50-79, đỏ nếu < 50). Chú thích rõ mức giảm hoa hồng để khuyến khích tài xế lái xe an toàn.

2. **Lấy trạng thái Stripe & Dư nợ:**
   * **API:** `GET /api/payment/payments/stripe/driver/account-status`
   * **Response:**
     ```json
     {
       "result": {
         "driverId": "usr_driver_01",
         "stripeAccountId": "acct_1P9xyz...",
         "status": "ACTIVE",
         "payoutsEnabled": true,
         "detailsSubmitted": true,
         "currentDebt": 45000.00
       }
     }
     ```

3. **Bấm nút [Liên kết tài khoản Stripe Express]:**
   * **API:** `POST /api/payment/payments/stripe/driver/onboard-link`
   * **Response:**
     ```json
     {
       "result": {
         "onboardUrl": "https://connect.stripe.com/setup/s/acct_xxx/...",
         "stripeAccountId": "acct_1P9xyz...",
         "expiresAt": 1730000000
       }
     }
     ```
   * **UX/Interaction:** 
     * App mở `onboardUrl` bằng **In-App Browser** (Chrome Custom Tabs trên Android hoặc Safari View Controller trên iOS).
     * **Lưu ý Đồ án (Stripe Test Mode):** Hướng dẫn người dùng/giảng viên bấm nút **[Skip this account form]** ở đầu trang.
     * Khi hoàn tất, Stripe tự điều hướng về `return-url` -> App đón sự kiện deep-link, đóng trình duyệt và tự động gọi lại `GET /account-status` để chuyển sang Badge xanh **ACTIVE**.

4. **Bấm nút [Quản lý thẻ ATM / Rút tiền trên Stripe Portal]:**
   * **API:** `POST /api/payment/payments/stripe/driver/dashboard-link`
   * **Response:**
     ```json
     {
       "result": {
         "dashboardUrl": "https://connect.stripe.com/express/acct_xxx/..."
       }
     }
     ```
   * **UX/Interaction:** Mở In-App Browser đưa tài xế sang cổng chính thức của Stripe. Tại đây tài xế tự do đổi số tài khoản ngân hàng (Vietcombank, MB, Techcombank...) hoặc theo dõi tiến độ tiền chuyển về thẻ ATM.

---

### 2. Màn hình "Chi tiết Chuyến đi & Sổ cái Giải ngân" (Trip Payout Detail)
Khi tài xế xem chi tiết một chuyến xe đã hoàn thành hoặc bấm vào lịch sử nhận tiền:

#### 🎨 Phác thảo Giao diện:
```text
┌─────────────────────────────────────────────────────────┐
│ [←]               CHI TIẾT THANH TOÁN                   │
├─────────────────────────────────────────────────────────┤
│ Mã vé: BK-038291                Chuyến: HN ➔ Hải Phòng   │
│ Thời gian hoàn tất: 14:30 - 29/10/2026                 │
├─────────────────────────────────────────────────────────┤
│ HÌNH THỨC: 💳 THẺ TRỰC TUYẾN (STRIPE)                   │
│                                                         │
│ 1. Giá vé khách trả:                        200.000 đ   │
│ 2. Hoa hồng sàn (Tỷ lệ ưu đãi 15%):        - 30.000 đ   │
│ ─────────────────────────────────────────────────────── │
│ Thu nhập sạch cuốc xe:                      170.000 đ   │
│                                                         │
│ 3. BÙ TRỪ NỢ TIỀN MẶT:                                  │
│    • Dư nợ tiền mặt trước cuốc:   45.000 đ              │
│    • Đã cấn trừ vào cuốc này:                - 45.000 đ │
│    • Dư nợ còn lại sau cuốc:          0 đ (SẠCH NỢ)     │
│ ─────────────────────────────────────────────────────── │
│ 💰 THỰC CHUYỂN VỀ TÀI KHOẢN STRIPE:         125.000 đ   │
│ Mã giao dịch chuyển tiền: tr_3P9821049x                  │
│ Trạng thái: 🟢 THÀNH CÔNG                               │
└─────────────────────────────────────────────────────────┘
```

#### 🔌 Tích hợp API tương ứng:
* **API:** `GET /api/payment/payments/stripe/driver/payouts`
* **Response Item:**
  ```json
  {
    "id": "payout_tx_01",
    "bookingId": "BK-038291",
    "totalFare": 200000.00,
    "commissionRate": 0.1500,
    "commissionAmount": 30000.00,
    "netDriverIncome": 170000.00,
    "debtBefore": 45000.00,
    "debtDeducted": 45000.00,
    "debtAfter": 0.00,
    "finalPayoutAmount": 125000.00,
    "status": "COMPLETED",
    "stripeTransferId": "tr_3P9821049x"
  }
  ```
* **UX/Interaction:**
  * Nếu `status == "COMPLETED"`: Badge xanh lá `[Đã chuyển vào Stripe]`.
  * Nếu `status == "FULL_DEBT_OFFSET"`: Badge xanh dương `[100% Cấn trừ nợ cũ]`, hiển thị số tiền nợ đã được giảm tương ứng, ghi chú rõ: *Không chuyển tiền vì đã cấn trừ sạch nợ*.

---

### 3. Màn hình "Tạo chuyến đi mới" (Trip Creation Check)
* **Logic chốt chặn nợ (REQ-P3-06):**
  * Trước khi tài xế bấm nút "Đăng chuyến xe":
  * App kiểm tra `currentDebt >= 500.000 đ` (lấy từ `GET /api/payment/payments/stripe/driver/account-status` hoặc `DriverProfile`).
  * **Nếu nợ >= 500k:**
    * Vô hiệu hóa nút `[Đăng chuyến xe]`.
    * Bật Popup cảnh báo:
      > 🛑 **Tài khoản bị tạm khóa tạo chuyến!**  
      > Dư nợ hoa hồng tiền mặt của bạn là **520.000 đ** (vượt hạn mức 500.000 đ).  
      > Vui lòng nạp tiền thanh toán nợ hoặc tiếp tục chở các cuốc khách thanh toán qua thẻ để hệ thống tự động cấn trừ và mở khóa.  
      > `[ 💳 Thanh toán nợ ngay ]`  `[ Để sau ]`

---

## 🙋‍♂️ III. CHI TIẾT THAY ĐỔI TRÊN PASSENGER APP (ỨNG DỤNG KHÁCH HÀNG)

### 1. Màn hình "Chi tiết Chuyến & Chọn phương thức thanh toán" (Checkout)

#### 🎨 Phác thảo Giao diện:
```text
┌─────────────────────────────────────────────────────────┐
│ [←]                  XÁC NHẬN ĐẶT CHỖ                   │
├─────────────────────────────────────────────────────────┤
│ Chuyến xe: Hà Nội ➔ Hải Phòng (15:00 hôm nay)          │
│ Tài xế: Nguyễn Văn A (⭐ 4.9)                            │
│ Số ghế đặt: 2 ghế                                       │
│ Tổng tiền vé: 400.000 đ                                 │
├─────────────────────────────────────────────────────────┤
│ CHỌN PHƯƠNG THỨC THANH TOÁN                             │
│                                                         │
│ [TRƯỜNG HỢP 1: TÀI XẾ ĐÃ KÍCH HOẠT STRIPE]              │
│   (•) 💳 Thẻ quốc tế / Nội địa (Stripe)                 │
│       Visa, Mastercard, JCB, Napas                      │
│       🔒 Sàn tạm giữ an toàn - Chỉ trả sau khi tới nơi  │
│                                                         │
│   ( ) 💵 Tiền mặt                                       │
│       Thanh toán trực tiếp cho tài xế khi xuống xe      │
│                                                         │
│ [TRƯỜNG HỢP 2: TÀI XẾ CHƯA KÍCH HOẠT STRIPE]            │
│   (•) 💵 Tiền mặt                                       │
│       Thanh toán trực tiếp cho tài xế khi xuống xe      │
│                                                         │
│   (x) 💳 Thẻ trực tuyến (Stripe) [BỊ KHÓA / XÁM MỜ]     │
│       ⚠️ Tài xế chuyến này chưa kích hoạt nhận tiền thẻ  │
├─────────────────────────────────────────────────────────┤
│ [                     XÁC NHẬN ĐẶT VÉ                   ]│
└─────────────────────────────────────────────────────────┘
```

#### 🔌 Tích hợp API tương ứng:

1. **Kiểm tra phương thức thanh toán khả dụng cho chuyến:**
   * **API:** `GET /api/trip/trip/{tripId}/payment-options`
   * **Response khi tài xế đã kích hoạt:**
     ```json
     {
       "result": {
         "tripId": "trip_hn_hp_01",
         "driverId": "usr_driver_01",
         "stripeEnabled": true,
         "cashEnabled": true,
         "message": "Chuyến đi hỗ trợ thanh toán thẻ Stripe và tiền mặt"
       }
     }
     ```
   * **Response khi tài xế chưa liên kết:**
     ```json
     {
       "result": {
         "tripId": "trip_hn_hp_02",
         "driverId": "usr_driver_02",
         "stripeEnabled": false,
         "cashEnabled": true,
         "message": "Tài xế chưa kích hoạt cổng Stripe, chuyến đi chỉ nhận tiền mặt"
       }
     }
     ```
   * **UX/Interaction:** Nếu `stripeEnabled == false`, Radio button Stripe bị disable (xám mờ), mặc định chọn `CASH` và hiển thị tooltip thông báo nhẹ nhàng cho khách.

2. **Xử lý Đặt vé & Ủy quyền thẻ (Pre-Authorization):**
   * Khách chọn `STRIPE`:
     * App gọi Stripe Mobile SDK (Payment Sheet) để nhập thẻ hoặc dùng Apple Pay/Google Pay.
     * Gọi `POST /api/payment/payments/create-intent` để nhận `client_secret`.
     * Stripe giữ tiền cọc (Hold).
     * Gọi `POST /api/booking/bookings` kèm `paymentMethod: "STRIPE"` và `paymentIntentId`.
     * Tiền được sàn giữ an toàn, bảo vệ khách hàng không sợ bị tài xế bỏ rơi.

---

### 2. Màn hình "Đánh giá Chuyến đi" (Trip Review & Reputation Hook)
Sau khi chuyến xe hoàn thành (`BookingStatus == COMPLETED`):
* App hiển thị Popup mời khách đánh giá tài xế:
  * Chọn từ 1 đến 5 sao.
  * Nhập nhận xét văn bản.
* **Tác động ngầm Giai đoạn 2:**
  * Nếu khách chấm **5 sao** -> Backend tự động cộng **+1 điểm uy tín** cho tài xế.
  * UI hiển thị thông điệp cảm ơn: *"Cảm ơn bạn! Đánh giá 5 sao của bạn đã giúp tài xế tăng điểm uy tín và nhận ưu đãi hoa hồng từ sàn."*

---

## 🖥️ IV. CHI TIẾT THAY ĐỔI TRÊN ADMIN WEB DASHBOARD

Dành cho Quản trị viên hệ thống để kiểm soát toàn bộ chính sách và dòng tiền:

### 1. Màn hình "Cấu hình Hoa hồng Sàn" (Commission Settings - Giai đoạn 2)
* **Đường dẫn:** `/admin/commission-config`
* **Chức năng:**
  * Xem cấu hình hiện tại: Tỷ lệ gốc (18%), Tối thiểu (12%), Tối đa (25%).
  * Cho phép Admin điều chỉnh các con số này và bấm `[Lưu thay đổi]`.
* **API:**
  * `GET /api/identity/admin/commission-config`
  * `PUT /api/identity/admin/commission-config`
* **UX/Interaction:** Khi lưu, Backend tự động xóa cache Redis `config:commission_rate` để áp dụng ngay lập tức cho các chuyến đi tiếp theo mà không cần khởi động lại server.

---

### 2. Màn hình "Báo cáo Công nợ & Đối soát Stripe Connect" (Payout Ledger - Giai đoạn 3)
* **Đường dẫn:** `/admin/financial/driver-payouts`
* **Chức năng:**
  * Bảng danh sách toàn bộ các giao dịch bù trừ nợ tự động trên hệ thống.
  * Lọc theo mã vé (`bookingId`), mã tài xế (`driverId`), hoặc trạng thái (`COMPLETED`, `FULL_DEBT_OFFSET`).
  * Hiển thị chi tiết: Tiền vé, Tiền hoa hồng sàn đã thu, Số nợ đã cấn trừ, Số tiền thực chuyển vào Stripe của tài xế.
  * Nút xuất báo cáo Excel/CSV phục vụ bảo vệ đồ án và kế toán.

---

## 📊 V. BẢNG TỔNG HỢP MATRIX API - SCREEN MAPPING

Dành cho Frontend Developers tra cứu nhanh khi ghép màn hình:

| Màn hình | Ứng dụng | API Endpoint | Method | Trạng thái / Dữ liệu chính |
| :--- | :--- | :--- | :---: | :--- |
| **Ví & Uy tín** | Driver App | `/api/identity/drivers/me/reputation` | `GET` | `reputationScore`, `effectiveRate`, `discount` |
| **Ví & Stripe** | Driver App | `/api/payment/payments/stripe/driver/account-status` | `GET` | `status`, `payoutsEnabled`, `currentDebt` |
| **Liên kết Stripe** | Driver App | `/api/payment/payments/stripe/driver/onboard-link` | `POST` | `onboardUrl` (Mở In-App Browser) |
| **Quản lý Thẻ ATM** | Driver App | `/api/payment/payments/stripe/driver/dashboard-link` | `POST` | `dashboardUrl` (Mở Express Portal) |
| **Lịch sử Nhận tiền**| Driver App | `/api/payment/payments/stripe/driver/payouts` | `GET` | Danh sách bù trừ nợ và chuyển tiền |
| **Chi tiết Chuyến** | Passenger App| `/api/trip/trip/{id}/payment-options` | `GET` | `stripeEnabled: true/false` |
| **Thanh toán Vé** | Passenger App| `/api/booking/bookings` | `POST` | Gửi `paymentMethod` (CASH hoặc STRIPE) |
| **Cấu hình Hoa hồng**| Admin Web | `/api/identity/admin/commission-config` | `GET/PUT` | `baseRate`, `minRate`, `maxRate` |

---

## 💡 VI. HƯỚNG DẪN TEST DÀNH CHO FRONTEND KHI CHẠM STRIPE TEST MODE

1. **Thao tác Onboard Tài xế:**
   * Khi mở `onboardUrl` trong webview, giao diện của Stripe Test Mode có một thanh banner màu cam ở trên cùng:
   * **Chỉ cần bấm nút: `[Skip this account form]`**.
   * Trình duyệt sẽ tự động hoàn tất 100% và kích hoạt `payouts_enabled = true` ngay lập tức mà không cần nhập số CMND/CCCD hay số tài khoản ngân hàng thật.

2. **Thao tác Khách thanh toán Thẻ Test:**
   * Sử dụng số thẻ test chuẩn của Stripe: `4242 •••• •••• 4242`
   * Ngày hết hạn: Bất kỳ ngày nào trong tương lai (ví dụ: `12/28`).
   * CVC: Bất kỳ 3 số (ví dụ: `123`).
   * Mã bưu điện (Zip code): `10000`.
   * Giao dịch sẽ được ủy quyền (Hold tiền) thành công 100%.
