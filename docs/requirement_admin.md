# TÀI LIỆU ĐẶC TẢ TRIỂN KHAI CÁC CHỨC NĂNG PHÂN HỆ QUẢN TRỊ [ADMIN]
# HỆ THỐNG ĐẶT XE GHÉP LIÊN TỈNH RIDEUP (RIDEUP MICROSERVICES)

> **Mục tiêu:** Tài liệu đặc tả kỹ thuật chi tiết danh mục các chức năng phía Admin cần triển khai vào mã nguồn (`identity-service`, `booking-service`, `trip-service`, `notification-service`, `payment-service` và `rideUpMicroUi`). Định rõ giao diện Web Admin, luồng thao tác người dùng, quy trình xử lý nội bộ của Agent/Backend, cấu trúc Database, API Contracts và danh mục file cần tạo/chỉnh sửa.

---

## BẢNG TỔNG HỢP DANH MỤC CHỨC NĂNG ADMIN CẦN TRIỂN KHAI

| Mã Chức Năng | Tên Chức Năng Admin Triển Khai | Microservice Backend | Đường Dẫn Frontend Web Admin | Mục Tiêu Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- |
| **ADM-FEAT-01** | **Cấu hình Tham số Hoa hồng Động, Điểm Uy tín & Hạn mức Nợ** | `identity-service` | `/admin/commission-config` | Xóa hardcode 20%; cấu hình động 7 tham số hoa hồng, quy tắc điểm uy tín và credit limit 500k. |
| **ADM-FEAT-02** | **Tổ hợp Báo cáo Thống kê Doanh thu & Quản trị Công nợ Tài xế** | `booking-service`<br>`payment-service` | `/admin/revenue-analytics` | Dashboard KPI tài chính, lọc đa chiều (ngày/tỉnh/loại tiền), cảnh báo nợ quá hạn và xuất Excel đối soát. |
| **ADM-FEAT-03** | **Quản trị & Cấu hình Động Thời gian Timeout Vận hành (SLA)** | `booking-service`<br>`trip-service` | `/admin/timeout-config` | Cấu hình động thời hạn tài xế duyệt vé, timeout thanh toán Stripe, timeout chợ nhu cầu và hủy vé. |
| **ADM-FEAT-04** | **Trung tâm Phát sóng Thông báo Thủ công Đa kênh** | `notification-service` | `/admin/broadcast-push` | Soạn và bắn Push Notification/In-App/WebSocket tới tài xế theo phân khúc (Tỉnh thành, điểm uy tín, vai trò). |
| **ADM-FEAT-05** | **Cấu hình Khung Giá Cước Tham chiếu Theo Km** | `trip-service` | `/admin/fare-boundary` | Cấu hình khoảng giá sàn/trần mỗi km liên tỉnh để chặn tài xế phá giá hoặc đội giá vé quá cao. |
| **ADM-FEAT-06** | **Tra cứu Nhật ký Kiểm toán Hành động Quản trị (Audit Log)** | `identity-service` | `/admin/audit-logs` | Truy vết toàn bộ lịch sử thay đổi tham số, ai sửa gì lúc nào (Snapshot Old vs New JSON). |

---

# 1. CHỨC NĂNG ADM-FEAT-01: CẤU HÌNH THAM SỐ HOA HỒNG ĐỘNG, ĐIỂM UY TÍN & HẠN MỨC NỢ

## 1.1. Mục tiêu Chức năng
Cho phép Admin thiết lập chính sách kinh tế linh hoạt cho nền tảng mà không cần sửa code Java hay deploy lại:
1. Cấu hình tỷ lệ hoa hồng cơ sở, tỷ lệ sàn ưu đãi đối tác vàng, tỷ lệ trần xử phạt tài xế vi phạm.
2. Cấu hình các mốc chuẩn và trọng số điều chỉnh theo Điểm Uy Tín (Reputation) và Đánh Giá Sao (Rating).
3. Cấu hình hạn mức nợ tiền mặt tối đa ($CreditLimit$) và ngưỡng uy tín tối thiểu để nhận cuốc xe.

## 1.2. Giao diện Web Admin (`/admin/commission-config`)
- **Vị trí trên Menu Sidebar:** `Cấu hình hệ thống` $\rightarrow$ `Hoa hồng & Uy tín`.
- **Thành phần giao diện:**
  - **Form 1 - Tham số Hoa hồng & Đòn bẩy:**
    - Tỷ lệ cơ sở $R_{base}$ (Input number %, mặc định `18%`).
    - Tỷ lệ sàn $R_{min}$ (Input number %, mặc định `12%`).
    - Tỷ lệ trần $R_{max}$ (Input number %, mặc định `25%`).
    - Rating chuẩn $Rate_{base}$ (Input number sao, mặc định `4.5`).
    - Bước nhảy hoa hồng theo Rating $W_{rate}$ (Input number %, mặc định `2.0%/sao`).
    - Uy tín chuẩn $Rep_{base}$ (Input number điểm, mặc định `80`).
    - Bước nhảy hoa hồng theo Uy tín $W_{rep}$ (Input number %, mặc định `1.0%` trên mỗi `10` điểm).
  - **Form 2 - Hạn mức & Kiểm soát Rủi ro:**
    - Hạn mức nợ tiền mặt tối đa ($CreditLimit$): Input VNĐ, mặc định `500.000 đ`.
    - Ngưỡng uy tín tối thiểu nhận chuyến ($MinAcceptScore$): Input điểm, mặc định `50 điểm`.
  - **Widget Mô phỏng Trực quan (Simulator):** Cho phép Admin kéo Slider thử nghiệm Rating (1 - 5) và Uy tín (0 - 100) để thấy ngay $R_{final}$ xuất ra trước khi bấm Lưu.
  - **Nút hành động:** `[Khôi phục mặc định]`, `[Xem trước mô phỏng]`, `[Lưu & Áp dụng ngay]`.

## 1.3. Quy trình Thao tác & Xử lý Nghiệp vụ (Step-by-Step)
1. **Bước 1 (Admin):** Mở trang `/admin/commission-config`, form tự động tải cấu hình hiện tại từ backend.
2. **Bước 2 (Admin):** Điều chỉnh tham số (VD: đổi $R_{base} = 17\%$, $CreditLimit = 600.000$ đ) $\rightarrow$ Nhấn **[Lưu & Áp dụng ngay]**.
3. **Bước 3 (Frontend Validation):** Kiểm tra điều kiện:
   - $0 < R_{min} \le R_{base} \le R_{max} \le 50\%$.
4. **Bước 4 (Backend Processing - `identity-service`):**
   - Lưu bản ghi mới/cập nhật vào bảng `commission_config`.
   - Làm mới Redis Key: `config:commission_rate` (TTL 24h).
   - Bắn Kafka Event: `CommissionConfigChangedEvent` tới topic `system-config-events` để các service tiêu thụ (`trip-service`, `payment-service`) đồng bộ.
5. **Bước 5 (Frontend):** Hiển thị Toast thông báo *"Cập nhật cấu hình hoa hồng thành công"*.

## 1.4. Danh mục File Cần Triển khai
- **Backend (`identity-service`):**
  - Entity: `com.example.demo.entity.CommissionConfig.java` (bổ sung các cột rating, rep step, credit limit).
  - DTO: `CommissionConfigUpdateRequest.java`, `CommissionConfigResponse.java`.
  - Service: `com.example.demo.service.CommissionService.java` (hàm `getCommissionConfig()`, `updateCommissionConfig()`, `calculateCommissionRate()`).
  - Controller: `com.example.demo.controller.AdminCommissionController.java`.
- **Frontend (`rideUpMicroUi`):**
  - Trang UI: `src/pages/admin/AdminCommissionConfigPage.jsx`.
  - API Service: Thêm hàm `getCommissionConfigApi()`, `updateCommissionConfigApi()` vào `src/services/adminApi.js`.
  - Route: Thêm route `/admin/commission-config` vào `src/routes/AppRoutes.jsx`.

---

# 2. CHỨC NĂNG ADM-FEAT-02: TỔ HỢP THỐNG KÊ DOANH THU & QUẢN TRỊ CÔNG NỢ TÀI XẾ

## 2.1. Mục tiêu Chức năng
Cung cấp bức tranh tài chính toàn diện cho Quản trị viên:
1. Thống kê tổng quan GMV, Doanh thu hoa hồng sàn thực thu, phân tách dòng tiền Tiền mặt vs Stripe Online.
2. Theo dõi công nợ hoa hồng của tài xế (`systemDebt`), tự động phát hiện các tài xế vượt hạn mức nợ bị khóa quyền nhận chuyến.


## 2.2. Giao diện Web Admin (`/admin/revenue-analytics`)
- **Vị trí trên Menu Sidebar:** `Thống kê & Báo cáo` $\rightarrow$ `Doanh thu & Công nợ`.
- **Thành phần giao diện:**
  - **Thanh Bộ lọc Tổ hợp (Filter Bar):**
    - Khoảng thời gian: Dropdown (Hôm nay, 7 ngày qua, Tháng này, Quý này, Tùy chọn `fromDate` - `toDate`).
    - Phương thức thanh toán: Tất cả / Tiền mặt (`CASH`) / Stripe (`STRIPE`).
    - Nút `[Lọc dữ liệu]`.
  - **Khối Thẻ Chỉ số Cốt lõi (4 KPI Cards):**
    - `Tổng GMV Giao dịch`: Tổng giá trị vé các chuyến hoàn thành.
    - `Doanh thu Hoa hồng Sàn`: Tiền thực sàn thu được ($GMV \times R_{final}$).
    - `Công nợ Đang treo`: Tổng `systemDebt` hiện tại của toàn bộ đối tác tài xế.
    - `Nợ đã Cấn trừ Tự động qua Stripe`: Số nợ tiền mặt đã thu hồi được qua cơ chế trừ tiền Stripe.
  - **Bảng Danh sách Tài xế Nợ (Driver Debt Ledger):**
    - Cột: Tên tài xế, SĐT, Biển số xe, Tỉnh hoạt động, Số nợ hiện tại (`systemDebt`), Hạn mức nợ (`creditLimit`), Trạng thái (`Bình thường` / `Quá hạn mức (Bị khóa)`).
    - Cột Hành động: `[Xem lịch sử nợ]`, `[Gửi Push nhắc nợ]`.

## 2.3. Quy trình Xử lý Nghiệp vụ
1. **Truy vấn Thống kê:** Backend truy vấn bảng `booking` kết hợp `driver_profile` qua các điều kiện lọc thời gian và tỉnh.
2. **Cơ chế Cấn trừ Nợ tự động (Stripe Offset):** Khi cuốc xe Stripe hoàn thành, `payment-service` kiểm tra nếu tài xế có $systemDebt > 0$, hệ thống tự động trích từ số tiền Stripe Payout để giảm $systemDebt$ và lưu bản ghi vào `debt_transactions`.
3. **Cơ chế Chặn / Mở khóa Tự động:**
   - Nếu $systemDebt > creditLimit$: Cập nhật `DriverProfile.status` hoặc cờ `isDebtBlocked = true`.
   - Khi tài xế nộp nợ hoặc có đủ cuốc Stripe cấn trừ đưa $systemDebt \le creditLimit$: Hệ thống tự động gỡ khóa.

## 2.4. Danh mục File Cần Triển khai
- **Backend (`booking-service` & `payment-service`):**
  - Entity: `com.rideup.payment_service.entity.DebtTransaction.java`.
  - Controller: `AdminAnalyticsController.java` (endpoint `/api/v1/admin/analytics/revenue-kpis`, `/api/v1/admin/analytics/driver-debts`, `/api/v1/admin/analytics/export-revenue`).
  - Service: `AnalyticsService.java`, `DebtManagementService.java`.
  - Service xuất Excel: Dùng thư viện Apache POI sinh file `.xlsx`.
- **Frontend (`rideUpMicroUi`):**
  - Trang UI: `src/pages/admin/AdminRevenueAnalyticsPage.jsx`.
  - Component con: `KpiCard.jsx`, `DriverDebtTable.jsx`, `DateRangePicker.jsx`.
  - API Service: Thêm `getRevenueKpisApi()`, `getDriverDebtsApi()`, `exportRevenueExcelApi()`.

---

# 3. CHỨC NĂNG ADM-FEAT-03: QUẢN TRỊ & CẤU HÌNH ĐỘNG THỜI GIAN TIMEOUT VẬN HÀNH (SLA)

## 3.1. Mục tiêu Chức năng
Cho phép Admin điều chỉnh linh hoạt các mốc thời gian chờ hết hạn (Timeouts SLA) theo điều kiện thời tiết hoặc mùa vụ cao điểm mà không sửa mã nguồn:
- Thời gian tài xế duyệt vé ghép (`MANUAL_APPROVAL`).
- Thời gian tồn tại của yêu cầu tìm xe trên Chợ nhu cầu (`TripRequest`).
- Thời gian tài xế duyệt yêu cầu chỉnh sửa vé của khách.
- Thời gian khách hàng được phép hủy chuyén
- Mốc thời gian an toàn cho phép khách hủy vé không bị trừ điểm uy tín.

## 3.2. Giao diện Web Admin (`/admin/timeout-config`)
- **Vị trí trên Menu Sidebar:** `Cấu hình hệ thống` $\rightarrow$ `Thời gian Timeout (SLA)`.
- **Thành phần giao diện:**
  - Bảng danh sách các tham số timeout hệ thống:
    - Cột 1: Mã cấu hình (`config_key`).
    - Cột 2: Tên nghiệp vụ hiển thị trực quan.
    - Cột 3: Thời gian hiện tại (Ô nhập số phút).
    - Cột 4: Giới hạn cho phép (Ví dụ: `5 - 60 phút`).
    - Cột 5: Mô tả hành động khi quá hạn (Hủy đơn / Nhả ghế / Hết hạn chợ).
    - Cột 6: Thao tác (`[Cập nhật]`, `[Mặc định]`).
  - Nút lưu tổng thể: `[Lưu toàn bộ thay đổi]`.

## 3.3. Quy trình Xử lý Nghiệp vụ & Schedulers
1. **Lưu trữ Cấu hình:** Bảng `system_timeout_config` lưu trữ tập trung.
2. **Caching:** Khi có thay đổi, đồng bộ ngay sang Redis Key: `config:system_timeouts`.
3. **Tiêu thụ Cấu hình khi tạo Giao dịch:**
   - Khi khách đặt vé `MANUAL_APPROVAL`: `booking.setExpiresAt(now.plusMinutes(timeoutMinutes))`.
   - Khi khách đăng yêu cầu Chợ: `tripRequest.setExpiresAt(now.plusMinutes(marketTimeoutMinutes))`.
4. **Xử lý Quét Hết hạn:** Các tiến trình `BookingExpireScheduler` và `TripRequestExpireScheduler` chạy định kỳ 1 phút/lần, dùng **ShedLock trên Redis** để quét các bản ghi có `expires_at < now()`, chuyển trạng thái.

## 3.4. Danh mục File Cần Triển khai
- **Backend (`booking-service` & `trip-service`):**
  - Entity: `com.rideUp.booking_service.entity.SystemTimeoutConfig.java`.
  - Repository: `SystemTimeoutConfigRepository.java`.
  - Controller: `AdminTimeoutConfigController.java` (`GET /api/v1/admin/system-timeouts`, `PUT /api/v1/admin/system-timeouts/{configKey}`).
  - Service: Cập nhật `BookingService.java` và `TripRequestService.java` để đọc thời gian timeout động từ Redis thay vì hardcode 15 phút.
- **Frontend (`rideUpMicroUi`):**
  - Trang UI: `src/pages/admin/AdminTimeoutConfigPage.jsx`.
  - API Service: `getSystemTimeoutsApi()`, `updateSystemTimeoutApi()`.

---

# 4. CHỨC NĂNG ADM-FEAT-04: TRUNG TÂM PHÁT SÓNG THÔNG BÁO THỦ CÔNG ĐA KÊNH

## 4.1. Mục tiêu Chức năng
Cung cấp công cụ cho Admin chủ động soạn thảo và phát sóng thông báo hàng loạt tới người dùng trong các trường hợp:
1. Thông báo thay đổi quy chế, điều khoản, chính sách hoa hồng mới.
2. Cảnh báo khẩn cấp: Thời tiết mưa bão, sạt lở đèo, ngập lụt các tuyến đường liên tỉnh.
3. Thông báo bảo trì nâng cấp máy chủ.
4. Gửi thông điệp khuyến khích tới nhóm tài xế có điểm uy tín cao hoặc cảnh báo nhóm tài xế điểm thấp.

## 4.2. Giao diện Web Admin (`/admin/broadcast-push`)
- **Vị trí trên Menu Sidebar:** `Vận hành & Hỗ trợ` $\rightarrow$ `Phát sóng Thông báo`.
- **Thành phần giao diện:**
  - **Khối 1 - Phân khúc Người nhận Mục tiêu (Audience Targeting):**
    - Nhóm vai trò: Radio button (`Tất cả người dùng`, `Chỉ Tài xế`, `Chỉ Hành khách`).
    - Lọc theo Tỉnh hoạt động (Khi chọn Tài xế): Checkbox đa chọn các tỉnh (Hà Nội, Nam Định, Thái Bình, TP.HCM...).
    - Lọc theo Điểm Uy Tín: Range slider (Từ điểm $X$ đến điểm $Y$, ví dụ: lọc nhóm $< 60$ để gửi cảnh báo).
    - Bộ đếm thời gian thực: `Dự kiến gửi tới: 342 thiết bị`.
  - **Khối 2 - Nội dung Thông báo:**
    - Tiêu đề thông báo (Text input).
    - Tóm tắt hiển thị Push Notification trên màn hình khóa điện thoại (Text area ngắn, $\le 200$ ký tự).
    - Nội dung chi tiết trong app (Rich text editor hỗ trợ Markdown/HTML).
    - Đường dẫn chuyển hướng (Deep link trong app, ví dụ: `rideup://policy/commission-2026`).
  - **Khối 3 - Kênh Phát sóng (Channels):**
    - Checkbox: `[x] FCM Push Notification (Điện thoại)` | `[x] Hòm thư trong App (Inbox)` | `[x] WebSocket Popup trực tiếp`.
  - **Nút bấm:** `[Lưu bản nháp]`, `[Xem trước giao diện điện thoại]`, `[Phát sóng ngay]`.

## 4.3. Quy trình Xử lý Nghiệp vụ & Phát sóng Đa kênh
1. **Bước 1 (Admin):** Nhập nội dung, chọn phân khúc lọc và bấm **[Phát sóng ngay]**.
2. **Bước 2 (`notification-service`):**
   - Gọi Feign Client sang `identity-service` truy vấn danh sách `userId` và `fcmDeviceToken` thỏa mãn tiêu chí lọc.
   - Tạo bản ghi chiến dịch trong bảng `broadcast_campaigns` với trạng thái `SENDING`.
3. **Bước 3 (Thực thi Đa kênh Bất đồng bộ):**
   - **Kênh FCM Push:** Dùng Firebase Admin SDK gửi tin nhắn đa mục tiêu (Batch push tối đa 500 tokens/lần) lên Notification Bar của điện thoại.
   - **Kênh In-App Inbox:** Bulk insert danh sách thông báo vào bảng `notification` của từng user để xem lại trong app.
   - **Kênh WebSocket:** Bắn bản tin qua STOMP Topic `/topic/announcements` để hiển thị modal khẩn cấp cho những ai đang online app.
4. **Bước 4:** Cập nhật bản ghi chiến dịch: `status = 'SENT'`, cập nhật `total_delivered`.

## 4.4. Danh mục File Cần Triển khai
- **Backend (`notification-service`):**
  - Entity: `com.rideup.notificationservice.entity.BroadcastCampaign.java`.
  - Repository: `BroadcastCampaignRepository.java`.
  - DTO: `CreateBroadcastRequest.java`, `BroadcastCampaignResponse.java`.
  - Controller: `AdminBroadcastController.java` (`POST /api/v1/admin/broadcasts/send-now`, `GET /api/v1/admin/broadcasts`).
  - Service: `BroadcastService.java` (tích hợp Firebase Cloud Messaging SDK & SimpMessagingTemplate WebSocket).
- **Frontend (`rideUpMicroUi`):**
  - Trang UI: `src/pages/admin/AdminBroadcastPage.jsx`.
  - Component: `AudienceFilterForm.jsx`, `MobilePreviewModal.jsx`.
  - API Service: `sendBroadcastApi()`, `getBroadcastCampaignsApi()`.

---

# 5. CHỨC NĂNG ADM-FEAT-05: CẤU HÌNH KHUNG GIÁ CƯỚC 
- **Microservice phụ trách:** `trip-service`
- **Giao diện Admin:** `/admin/fare-boundary`
- **Mục tiêu & Nghiệp vụ:**
  - Thiết lập đơn giá tối thiểu `min_price_per_km` (mặc định: `1.200 đ/km/ghế`) và tối đa `max_price_per_km` (mặc định: `4.000 đ/km/ghế`).
  - Khi tài xế tạo chuyến liên tỉnh hoặc gửi lời mời khách từ Chợ nhu cầu, hệ thống tính khoảng cách dự kiến theo bản đồ và kiểm tra:
    $$\text{Đơn giá vé} \in [\text{DistanceKm} \times min\_price\_per\_km, \text{DistanceKm} \times max\_price\_per\_km]$$
  - Nếu vi phạm: Chặn tạo chuyến và hiển thị thông báo lỗi giá cước không hợp lệ.
- **API Contracts:** `GET /api/v1/admin/fare-boundaries`, `PUT /api/v1/admin/fare-boundaries`.


# 6. MA TRẬN TRIỂN KHAI BACKEND VÀ FRONTEND CHO DEV / AGENT

```
                           +-------------------------------------+
                           |      API GATEWAY (Port 8080)        |
                           |  JWT Filter (Role: ADMIN, SUPER)   |
                           +------------------+------------------+
                                              |
        +------------------+------------------+------------------+------------------+
        |                  |                  |                  |                  |
+-------v-------+  +-------v-------+  +-------v-------+  +-------v-------+  +-------v-------+
|identity-serv  |  |booking-service|  |payment-service|  | trip-service  |  |notification-s|
|Port: 8081     |  |Port: 8082     |  |Port: 8084     |  |Port: 8083     |  |Port: 8086     |
+-------+-------+  +-------+-------+  +-------+-------+  +-------+-------+  +-------+-------+
| ADM-FEAT-01:  |  | ADM-FEAT-03:  |  | ADM-FEAT-02:  |  | ADM-FEAT-03:  |  | ADM-FEAT-04:  |
| - Commission  |  | - Booking     |  | - Debt Ledger |  | - Trip Market |  | - Manual Push |
|   Config API  |  |   Timeout API |  | - Auto-Offset |  |   Timeout API |  |   Broadcast   |
| ADM-FEAT-06:  |  | ADM-FEAT-02:  |  | - Export Excel|  | ADM-FEAT-05:  |  | - FCM Multi   |
| - Audit Logs  |  | - GMV / KPIs  |  |               |  | - Fare Limit  |  | - In-App Box  |
+---------------+  +---------------+  +---------------+  +---------------+  +---------------+
```

### Các bước Triển khai Tuần tự (Implementation Checklist):
1. **Bước 1 (Backend - Database & Entities):**
   - Chạy migration script tạo các bảng: `commission_config`, `system_timeout_config`, `debt_transactions`, `broadcast_campaigns`, `fare_boundary_config`, `admin_audit_logs`.
2. **Bước 2 (Backend - Services & Schedulers):**
   - Triển khai logic tính hoa hồng cá nhân hóa theo 7 tham số tại `CommissionService.java`.
   - Cập nhật các Scheduler hết hạn với Redis ShedLock tại `booking-service` và `trip-service`.
   - Triển khai logic cấn trừ nợ tự động và thống kê doanh thu tại `payment-service` / `booking-service`.
   - Triển khai động cơ gửi Push đa kênh tại `notification-service`.
3. **Bước 3 (Backend - Admin REST Controllers):**
   - Viết các Controller bảo vệ bởi `@PreAuthorize("hasRole('ADMIN')")`.
   - Khai báo routing tương ứng tại `api-gateway/src/main/resources/application.yaml`.
4. **Bước 4 (Frontend Web Admin - `rideUpMicroUi`):**
   - Tạo 5 trang quản trị mới trong thư mục `src/pages/admin/`.
   - Bổ sung các hàm gọi API trong `src/services/adminApi.js`.
   - Tích hợp điều hướng Sidebar trên `AdminDashboardPage.jsx` và cập nhật router `AppRoutes.jsx`.
