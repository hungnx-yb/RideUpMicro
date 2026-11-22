# RIDEUP - TÀI LIỆU TEST DESIGN TOÀN DIỆN HỆ THỐNG
**Dự án:** Nền tảng Xe ghép Liên tỉnh RideUp (Microservices Architecture)  
**Tài liệu tham chiếu:** `RIDEUP_TAI_LIEU_NGHIEP_VU_TOAN_DIEN.md`  
**Phiên bản:** 1.0  
**Mục tiêu:** Phân chia trách nhiệm kiểm thử chi tiết, rõ ràng, độc lập cho 3 nhân sự QA/QC hoặc Lập trình viên phụ trách kiểm thử.

---

## BẢNG PHÂN CHIA TRÁCH NHIỆM KIỂM THỬ (TEST ASSIGNMENT MATRIX)

| Người phụ trách | Phân hệ / Module kiểm thử | Phạm vi Nghiệp vụ & Dịch vụ liên quan |
| :--- | :--- | :--- |
| **Tester 1** | **Module Khách hàng (Customer Module)** | `rideup-customer-app`, `booking-service`, `trip-service` (Search/Marketplace), `payment-service` (Stripe PaymentSheet), `review-service`. Luồng: Tìm chuyến, Đặt vé (Tiền mặt/Stripe Direct Pre-auth), Đổi lộ trình đón/trả, Hủy vé theo Cutoff, Sàn Chợ nhu cầu (Khách), Đánh giá Rating thực tế. |
| **Tester 2** | **Module Tài xế (Driver & FinTech Module)** | `rideup-driver-app`, `trip-service`, `booking-service` (Duyệt vé/Đổi điểm), `payment-service` (Stripe Connect, Payout & Auto Debt Offset), `identity-service` (Tỉnh hoạt động, Nợ, Uy tín). Luồng: Đăng chuyến & Kiểm tra khung giá Km, Duyệt/Từ chối đón (Optimistic Locking), Xử lý sửa vé, Vận hành hành trình (Started, Completed, Auto-lifecycle), Chợ nhu cầu (Mời khách), Stripe Connect & 3 Kịch bản cấn trừ nợ ví. |
| **Tester 3** | **Module Admin + Chat + Auth & eKYC AI** | `rideUpMicroUi` (Web Admin), `identity-service`, `ai-service` (Python FastAPI), `chat_service` (STOMP WebSocket), `notification-service` (FCM/In-app). Luồng: Đăng ký/Đăng nhập & Quản lý Token JWT, eKYC Liveness MiniFASNet + So khớp FaceNet, Thẩm định Tài xế & Xe (Ràng buộc duyệt), Chat realtime, Cấu hình SLA động, Quản lý tài chính & hoa hồng sàn. |

---

# PHẦN 1: TEST DESIGN DÀNH CHO TESTER 1 (MODULE KHÁCH HÀNG)

### Test Suite 1.1: Tìm kiếm Chuyến xe Ghép
* **Mục tiêu:** Đảm bảo khách hàng tìm kiếm chuyến xe chính xác theo lộ trình hành chính tinh gọn (không dùng bản đồ), ngày giờ và số ghế.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CUS-001** | Tìm kiếm chuyến hợp lệ có kết quả | Có sẵn chuyến xe `OPEN` tuyến Hà Nội $\rightarrow$ Hải Phòng còn $\ge 2$ ghế trống | 1. Mở màn hình Tìm chuyến.<br>2. Chọn Tỉnh đi: "Hà Nội", Tỉnh đến: "Hải Phòng".<br>3. Chọn ngày đi trùng ngày chuyến.<br>4. Chọn số ghế: 2.<br>5. Bấm [Tìm chuyến]. | Tỉnh đi: 1 (Hà Nội)<br>Tỉnh đến: 31 (Hải Phòng)<br>Ngày: Hôm nay<br>Số ghế: 2 | Hiển thị danh sách các chuyến xe thỏa mãn. Mỗi thẻ chuyến hiển thị: Giờ chạy, Tên tài xế, Rating (sao), Hiệu xe, Giá vé/ghế, Số ghế trống. | **P1** |
| **TC-CUS-002** | Tìm kiếm khi số ghế yêu cầu vượt quá số ghế còn lại | Chuyến xe chỉ còn 1 ghế trống | 1. Chọn đúng tuyến và ngày.<br>2. Chọn số ghế: 2.<br>3. Bấm [Tìm chuyến]. | Số ghế: 2 | Chuyến xe còn 1 ghế không xuất hiện trong danh sách kết quả. | **P1** |
| **TC-CUS-003** | Tìm kiếm không có chuyến phù hợp (Gợi ý Sàn Chợ) | Không có chuyến nào chạy tuyến Hà Nội $\rightarrow$ Cà Mau trong ngày | 1. Chọn Tỉnh đi: "Hà Nội", Tỉnh đến: "Cà Mau".<br>2. Bấm [Tìm chuyến]. | Hà Nội $\rightarrow$ Cà Mau | Hiển thị màn hình trống kèm thông báo "Không tìm thấy chuyến xe phù hợp" và hiển thị nút **[Đăng yêu cầu tìm xe]** để chuyển sang Sàn Chợ. | **P2** |
| **TC-CUS-004** | Chặn tìm kiếm khi điểm đi trùng điểm đến | Không | 1. Chọn Tỉnh đi: "Hà Nội".<br>2. Chọn Tỉnh đến: "Hà Nội".<br>3. Bấm [Tìm chuyến]. | Tỉnh đi = Tỉnh đến = Hà Nội | Hệ thống hiển thị cảnh báo lỗi: Điểm xuất phát và điểm đến không được trùng nhau. | **P2** |

---

### Test Suite 1.2: Luồng Đặt vé (Booking) - Tiền mặt & Thẻ Stripe Pre-auth
* **Mục tiêu:** Kiểm tra chọn điểm đón/trả tinh gọn, thanh toán thẻ trực tiếp qua Stripe PaymentSheet và đặt vé tiền mặt.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CUS-005** | Đặt vé thành công bằng Tiền mặt (`CASH`) | Khách đã đăng nhập, chuyến xe có sẵn | 1. Chọn chuyến xe $\rightarrow$ Bấm [Đặt chỗ].<br>2. Chọn Phường/Xã đón từ dropdown lộ trình chuyến xe, nhập số nhà/tên đường đón.<br>3. Chọn Phường/Xã trả từ dropdown, nhập địa chỉ trả chi tiết.<br>4. Nhập tên và SĐT người đi.<br>5. Chọn phương thức: **Tiền mặt**.<br>6. Bấm [Xác nhận đặt vé]. | PaymentMethod: `CASH`<br>Số ghế: 1 | - Backend tạo Booking trạng thái `WAITING_DRIVER_APPROVAL`, `paymentStatus = PENDING`.<br>- `expiresAt` được tính bằng $\min(now + 120p, departureTime - 1h)$.<br>- Ghế trên chuyến xe **chưa bị trừ**.<br>- Chuyển sang màn hình Chi tiết vé hiển thị "Chờ tài xế xác nhận". | **P1** |
| **TC-CUS-006** | Đặt vé Thẻ Stripe thành công qua Direct Pre-auth (`HOLDING`) | Khách đã đăng nhập, tài xế chuyến xe đã kích hoạt Stripe Connect (`stripePayoutsEnabled = true`) | 1. Nhập điểm đón/trả và thông tin người đi.<br>2. Chọn phương thức: **Thẻ quốc tế (Stripe)**.<br>3. Bấm đặt vé $\rightarrow$ Popup thanh toán Stripe PaymentSheet xuất hiện.<br>4. Nhập thông tin thẻ Test hợp lệ (4242...).<br>5. Xác thực thanh toán thành công. | PaymentMethod: `STRIPE`<br>Thẻ: 4242 4242 4242 4242<br>CVC: 123, Exp: 12/28 | - App gọi `createPaymentIntent` với `capture_method = MANUAL`.<br>- App gọi `createBooking` kèm `paymentIntentId`.<br>- Booking chuyển thẳng `WAITING_DRIVER_APPROVAL`, `paymentStatus = HOLDING`.<br>- Tiền bị phong tỏa trên thẻ khách, sàn chưa thu. | **P1** |
| **TC-CUS-007** | Hủy ngang khi đang mở Stripe PaymentSheet | Mở PaymentSheet | 1. Bấm nút [Hủy / Đóng] trên Stripe PaymentSheet mà không thanh toán. | Hủy form thẻ | - Không có booking nào được tạo trên hệ thống.<br>- Không có giao dịch trừ tiền trên thẻ.<br>- App giữ nguyên giao diện đặt chỗ để khách chọn lại phương thức. | **P2** |
| **TC-CUS-008** | Chặn đặt trùng chuyến xe (Duplicate Booking) | Khách đã có 1 vé `WAITING_DRIVER_APPROVAL` hoặc `CONFIRMED` trên chuyến này | 1. Dùng cùng tài khoản khách chọn lại đúng chuyến xe đó và bấm đặt vé. | Cùng `customerId` và `tripId` | Hệ thống báo lỗi `DUPLICATE_BOOKING` ("Bạn đã có vé đang hoạt động trên chuyến xe này"), không cho tạo đơn thứ hai. | **P1** |
| **TC-CUS-009** | Idempotency Key chống bấm liên tiếp khi mạng chập chờn | Mạng kết nối chậm (Throttle 3G) | 1. Khách bấm liên tiếp nhiều lần vào nút [Xác nhận đặt vé] trong vòng 1 giây. | Cùng `Idempotency-Key` header | Chỉ có duy nhất 1 booking được tạo trong CSDL. Các request sau trả về kết quả của request đầu tiên (HTTP 200), không bị nhân đôi số vé. | **P1** |

---

### Test Suite 1.3: Chỉnh sửa Lộ trình Đón/Trả (Booking Modification)
* **Mục tiêu:** Kiểm tra 2 kịch bản sửa vé: tự động duyệt khi `WAITING_DRIVER_APPROVAL` và gửi duyệt khi `CONFIRMED`.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CUS-010** | Tự động cập nhật lộ trình khi vé đang chờ duyệt | Vé đang ở trạng thái `WAITING_DRIVER_APPROVAL` | 1. Khách mở Chi tiết vé $\rightarrow$ Bấm [Sửa lộ trình].<br>2. Thay đổi số nhà đón và ghi chú mới.<br>3. Bấm [Lưu thay đổi]. | Đón mới: "Số 99 Cầu Giấy"<br>Ghi chú mới: "Có thêm 1 vali lớn" | - Hệ thống tự động cập nhật trực tiếp vào Booking.<br>- Tạo bản ghi `BookingModification` với trạng thái **`APPROVED`** ngay lập tức.<br>- Hiển thị thông báo "Đã cập nhật thành công lộ trình mới vào vé". | **P1** |
| **TC-CUS-011** | Gửi yêu cầu đổi lộ trình khi vé đã chốt (`CONFIRMED`) | Vé đang ở trạng thái `CONFIRMED`, chuyến xe còn $> 2$ tiếng mới chạy | 1. Khách mở Chi tiết vé $\rightarrow$ Bấm [Sửa lộ trình].<br>2. Nhập điểm đón/trả mới.<br>3. Bấm [Gửi yêu cầu tới tài xế]. | Đón mới: "Cổng bến xe Mỹ Đình" | - Tạo bản ghi `BookingModification` trạng thái **`PENDING_DRIVER`**.<br>- Thời hạn phản hồi `expiresAt = now + 15 phút`.<br>- Vé gốc giữ nguyên lộ trình cũ cho đến khi tài xế duyệt.<br>- App khách hiển thị banner "Đang chờ tài xế phản hồi yêu cầu đổi lộ trình (còn X phút)". | **P1** |
| **TC-CUS-012** | Chặn sửa vé khi đã đủ 2 lần thành công | Vé đã có 2 lần chỉnh sửa ở trạng thái `APPROVED` | 1. Khách mở Chi tiết vé. | `approvedCount = 2` | Nút [Sửa lộ trình] bị ẩn hoặc vô hiệu hóa. Nếu cố tình gọi API thì backend ném lỗi `MODIFICATION_LIMIT_EXCEEDED`. | **P2** |
| **TC-CUS-013** | Chặn sửa vé khi cận giờ khởi hành ($< 2$ tiếng) | Chuyến xe khởi hành sau 1 tiếng 30 phút nữa | 1. Khách mở Chi tiết vé bấm [Sửa lộ trình]. | Thời gian còn lại: 90 phút | Hệ thống cảnh báo: "Không thể chỉnh sửa lộ trình do chuyến xe đã cận giờ khởi hành (dưới 2 tiếng)". | **P2** |
| **TC-CUS-014** | Yêu cầu đổi lộ trình bị hết hạn SLA 15 phút | Có yêu cầu `PENDING_DRIVER` chưa được tài xế phản hồi | 1. Chờ qua 15 phút mà tài xế không bấm duyệt hoặc từ chối.<br>2. Scheduler `expirePendingModifications` kích hoạt. | Quá 15 phút | - Bản ghi đổi vé chuyển sang **`EXPIRED`**.<br>- Vé gốc giữ nguyên lộ trình ban đầu.<br>- Khách nhận thông báo: "Yêu cầu sửa lộ trình đã hết hạn do tài xế không phản hồi". | **P2** |

---

### Test Suite 1.4: Chính sách Hủy vé (Booking Cancellation)
* **Mục tiêu:** Kiểm tra quy định hủy vé trước/sau Cutoff 2 tiếng và kiểm tra hoàn tiền/hủy giữ tiền.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CUS-015** | Hủy vé hợp lệ khi đang `WAITING_DRIVER_APPROVAL` | Vé Tiền mặt hoặc Stripe đang chờ duyệt | 1. Mở Chi tiết vé $\rightarrow$ Bấm [Hủy vé].<br>2. Chọn lý do hủy $\rightarrow$ Xác nhận. | Lý do: "Đổi kế hoạch cá nhân" | - Vé chuyển sang `CANCELLED_USER`.<br>- Nếu là vé Stripe: `paymentStatus` chuyển sang **`VOIDED`** (hủy ủy quyền giữ tiền trên thẻ ngay lập tức).<br>- Không cần nhả ghế vì chưa từng trừ ghế. | **P1** |
| **TC-CUS-016** | Hủy vé hợp lệ khi `CONFIRMED` trước giờ chạy $\ge 2$ tiếng | Vé `CONFIRMED`, giờ chạy còn 4 tiếng nữa | 1. Mở Chi tiết vé $\rightarrow$ Bấm [Hủy vé].<br>2. Xác nhận hủy. | Còn 4 tiếng trước giờ chạy | - Vé chuyển sang `CANCELLED_USER`.<br>- Ghế trên chuyến xe được **nhả lại (tăng lại ghế trống)** an toàn.<br>- Nếu là Stripe: Gọi void tiền hold (`paymentStatus = VOIDED`).<br>- Chuyến xe nếu đang `FULL` tự động chuyển về `OPEN`. | **P1** |
| **TC-CUS-017** | Chặn hủy vé khi quá Cutoff ($< 2$ tiếng trước giờ chạy) | Vé `CONFIRMED`, chuyến xe chạy sau 1 tiếng nữa | 1. Mở Chi tiết vé $\rightarrow$ Bấm [Hủy vé]. | Còn 60 phút trước giờ chạy | App hiển thị thông báo chặn: "Theo chính sách của RideUp, chỉ được phép hủy vé trước giờ khởi hành tối thiểu 2 tiếng. Hiện chuyến xe đã quá cận giờ chạy." Nút xác nhận bị chặn. | **P1** |

---

### Test Suite 1.5: Sàn Chợ Nhu Cầu Đi Xe (Dành cho Khách)
* **Mục tiêu:** Kiểm tra đăng tìm xe, nhận lời mời từ tài xế và chuyển đổi thành vé chính thức.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CUS-018** | Đăng yêu cầu tìm xe thành công (`TripRequest`) | Khách đã đăng nhập | 1. Vào mục Sàn Chợ $\rightarrow$ [Đăng tìm xe].<br>2. Nhập tỉnh đi, xã đón, tỉnh đến, xã trả, giờ xuất phát mong muốn, số ghế: 2, ghi chú.<br>3. Bấm [Đăng yêu cầu]. | Tỉnh đi: Hà Nội, Tỉnh đến: Ninh Bình<br>Số ghế: 2 | - Tạo `TripRequest` trạng thái `OPEN`.<br>- Hạn tồn tại `expiresAt = now + 24h` (`MARKETPLACE_REQUEST_TTL`).<br>- Hiển thị trên danh sách yêu cầu đang mở của khách. | **P1** |
| **TC-CUS-019** | Nhận lời mời ghép xe & Chấp thuận lời mời | Yêu cầu tìm xe đang `OPEN`, tài xế đã gửi lời mời (`PENDING`) | 1. Khách mở chi tiết yêu cầu tìm xe.<br>2. Xem danh sách lời mời (so sánh giá, giờ đón, xe).<br>3. Bấm [Chấp thuận lời mời] trên lời mời của Tài xế A.<br>4. Chọn thanh toán Tiền mặt hoặc hoàn tất giữ thẻ Stripe. | Lời mời ID: `inv_123`<br>Phương thức: `CASH` | - `TripRequest` chuyển `ACCEPTED`.<br>- Lời mời được chọn chuyển `ACCEPTED`, các lời mời khác tự động chuyển `REJECTED`.<br>- Tự động tạo Booking với trạng thái **`CONFIRMED`** (không qua chờ duyệt) và **trừ ghế ngay** trên chuyến xe của tài xế. | **P1** |
| **TC-CUS-020** | Khách chủ động hủy yêu cầu tìm xe | Yêu cầu đang ở trạng thái `OPEN` | 1. Mở chi tiết yêu cầu $\rightarrow$ Bấm [Hủy yêu cầu]. | Yêu cầu ID: `req_001` | `TripRequest` chuyển sang `CANCELLED`. Toàn bộ các lời mời đang chờ (`PENDING`) tự động bị từ chối (`REJECTED`). | **P2** |

---

### Test Suite 1.6: Đánh giá Chuyến đi (Review & Rating Thực tế)
* **Mục tiêu:** Kiểm tra khách chấm điểm 1-5 sao và xác minh công thức trung bình cộng số học chuẩn xác.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-CUS-021** | Đánh giá chuyến đi thành công | Vé ở trạng thái `COMPLETED`, chưa từng đánh giá | 1. Mở màn hình Đánh giá chuyến đi.<br>2. Chọn số sao: 5 sao.<br>3. Nhập nhận xét: "Tài xế lái xe cẩn thận, đúng giờ".<br>4. Bấm [Gửi đánh giá]. | Rating: 5<br>Comment: "Tốt" | - Lưu bản ghi Review vào MongoDB.<br>- `ReviewService` tính lại Rating của tài xế theo công thức trung bình cộng số học.<br>- Bắn Kafka `DriverRatingUpdatedEvent` sang `identity-service`.<br>- Cột `driverRating` của tài xế được cập nhật đúng. | **P1** |
| **TC-CUS-022** | Chặn đánh giá trùng lặp trên cùng 1 vé | Vé đã được gửi đánh giá ở TC-CUS-021 | 1. Dùng cùng mã bookingId gọi lại API tạo đánh giá. | BookingId đã đánh giá | Backend trả lỗi `ErrorCode.REVIEW_ALREADY_EXISTS` ("Booking has already been reviewed"), không cho đánh giá lần 2. | **P2** |
| **TC-CUS-023** | Xác minh tính đúng đắn của công thức Rating thực tế | Tài xế đang có 1 đánh giá 4 sao ($R_1 = 4.0, v = 1$) | 1. Khách hàng thứ hai gửi đánh giá 5 sao ($R_2 = 5.0$). | Rating mới: 5 sao | - Tổng lượt đánh giá: $v = 2$.<br>- Điểm trung bình: $\frac{4.0 + 5.0}{2} = 4.5$.<br>- Hệ thống cập nhật Rating mới = **4.5** (không bị kéo lệch bởi công thức làm mịn Bayesian cũ). | **P1** |

---

# PHẦN 2: TEST DESIGN DÀNH CHO TESTER 2 (MODULE TÀI XẾ & FINTECH)

### Test Suite 2.1: Điều kiện & Tạo Chuyến xe (`Trip`) có Kiểm soát Khung giá Km
* **Mục tiêu:** Kiểm tra các rào cản nợ sàn, điểm uy tín, số ghế và kiểm soát khung cước Km (`FareBoundaryService`).

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DRI-001** | Tạo chuyến xe thành công với giá cước hợp lệ | Tài xế và xe đã được duyệt, nợ = 0, uy tín = 80 | 1. Đăng nhập Driver App $\rightarrow$ [Tạo chuyến].<br>2. Chọn Tuyến Hà Nội $\rightarrow$ Hải Phòng (khoảng cách 105 km).<br>3. Nhập điểm xuất phát, điểm đến, giờ chạy, số ghế: 4.<br>4. Nhập giá vé: 150.000 đ/ghế.<br>5. Bấm [Đăng chuyến]. | Tuyến: Hà Nội - Hải Phòng<br>Khoảng cách: ~105km<br>Giá vé: 150.000 đ/ghế | Chuyến xe tạo thành công ở trạng thái **`OPEN`**, `seatAvailable = 4`. Giá vé nằm trong khung hợp lệ ($minPrice \approx 163.800$ đ tùy km thực tế). | **P1** |
| **TC-DRI-002** | Chặn tạo chuyến khi giá vé dưới sàn cước Km (Phá giá) | Tài xế đủ điều kiện | 1. Chọn tuyến Hà Nội $\rightarrow$ Hải Phòng (105 km).<br>2. Nhập giá vé cực rẻ: 30.000 đ/ghế.<br>3. Bấm [Đăng chuyến]. | Giá vé: 30.000 đ<br>(Khung sàn tối thiểu $\approx 163.000$ đ) | Hệ thống ném lỗi `FARE_OUT_OF_RANGE`: "Giá cước quá thấp so với khung quy định (tối thiểu X đ)", từ chối tạo chuyến. | **P1** |
| **TC-DRI-003** | Chặn tạo chuyến khi giá vé vượt trần cước Km (Đội giá) | Tài xế đủ điều kiện | 1. Chọn tuyến Hà Nội $\rightarrow$ Hải Phòng.<br>2. Nhập giá vé quá cao: 900.000 đ/ghế.<br>3. Bấm [Đăng chuyến]. | Giá vé: 900.000 đ<br>(Khung trần tối đa $\approx 546.000$ đ) | Hệ thống ném lỗi `FARE_OUT_OF_RANGE`: "Giá cước vượt quá mức trần cho phép", từ chối tạo chuyến. | **P1** |
| **TC-DRI-004** | Chặn tạo chuyến khi tài xế nợ sàn vượt hạn mức | Dư nợ tiền mặt của tài xế = 600.000 đ ($> CREDIT\_LIMIT = 500.000$ đ) | 1. Tài xế thực hiện tạo chuyến xe bất kỳ. | Dư nợ: 600.000 đ | Hệ thống chặn với lỗi `ACCOUNT_BLOCKED_DUE_TO_DEBT`: "Tài khoản bị khóa chức năng tạo chuyến do vượt quá hạn mức nợ hoa hồng sàn. Vui lòng nạp tiền thanh toán nợ." | **P1** |
| **TC-DRI-005** | Chặn tạo chuyến khi điểm uy tín dưới ngưỡng | Điểm uy tín của tài xế = 45 điểm ($< MIN\_ACCEPT\_SCORE = 50$) | 1. Tài xế thực hiện tạo chuyến xe bất kỳ. | Điểm uy tín: 45 | Hệ thống chặn với lỗi `DRIVER_REPUTATION_TOO_LOW`: "Điểm uy tín dưới 50 điểm, bị đình chỉ tạo chuyến." | **P1** |
| **TC-DRI-006** | Chặn đăng số ghế vượt quá sức chứa của xe | Xe đăng kiểm 4 chỗ ngồi (`seatCapacity = 4`) | 1. Khi tạo chuyến, nhập số ghế mở bán: 6 ghế. | Số ghế đăng ký: 6<br>Sức chứa xe: 4 | Hệ thống ném lỗi `SEAT_EXCEEDS_CAPACITY` ("Số ghế vượt quá sức chứa đăng kiểm của xe"). | **P2** |
| **TC-DRI-007** | Chặn trùng xã/phường trên các điểm đón dọc đường | Tài xế nhập danh sách điểm dừng | 1. Thêm 2 điểm đón dọc đường có cùng `wardId`. | Trùng `wardId` điểm đón | Hệ thống ném lỗi từ chối tạo chuyến, yêu cầu các điểm đón/trả phải thuộc các xã/phường phân biệt. | **P2** |

---

### Test Suite 2.2: Duyệt/Từ chối Đặt vé & Trừ ghế bằng Optimistic Locking
* **Mục tiêu:** Kiểm tra tài xế nhận thông báo đơn mới, duyệt đón (trừ ghế an toàn chống Race Condition) hoặc từ chối đón.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DRI-008** | Duyệt đón khách thành công (`CONFIRMED`) | Có đơn vé `WAITING_DRIVER_APPROVAL` 2 ghế, chuyến xe còn 3 ghế trống | 1. Tài xế mở Driver App $\rightarrow$ Tab Đơn chờ duyệt.<br>2. Xem thông tin điểm đón chi tiết của khách.<br>3. Bấm nút **[Duyệt đón]**. | Đơn vé ID: `bk_001`<br>Số ghế đặt: 2 | - Đơn vé chuyển sang **`CONFIRMED`**.<br>- Số ghế trống trên chuyến xe giảm từ 3 xuống 1 (`seatAvailable = 1`).<br>- Khách hàng nhận được thông báo đẩy "Vé của bạn đã được tài xế xác nhận đón". | **P1** |
| **TC-DRI-009** | Từ chối đón khách (`REJECTED_BY_DRIVER`) | Có đơn vé Stripe `WAITING_DRIVER_APPROVAL` | 1. Tài xế bấm nút **[Từ chối]** trên đơn vé.<br>2. Nhập lý do từ chối: "Xe không tiện đường qua ngõ nhỏ".<br>3. Bấm xác nhận từ chối. | Lý do: "Không tiện đường" | - Vé chuyển sang **`REJECTED_BY_DRIVER`**.<br>- Giao dịch thẻ Stripe tự động được giải phóng tiền giữ (`PaymentStatus.VOIDED`).<br>- Số ghế trên chuyến xe không thay đổi. | **P1** |
| **TC-DRI-010** | Tranh chấp ghế cuối cùng (Race Condition - Optimistic Locking) | Chuyến xe chỉ còn đúng 1 ghế trống. Có 2 khách cùng gửi yêu cầu đặt 1 ghế (Đơn A và Đơn B). | 1. Tài xế duyệt Đơn A trên máy 1.<br>2. Ngay lập tức trong cùng 1 giây, tài xế bấm duyệt Đơn B trên máy 2 (hoặc qua 2 tab). | Chuyến xe còn 1 ghế.<br>Duyệt đồng thời Đơn A & B | - Đơn commit trước thành công $\rightarrow$ trừ ghế về 0, chuyển `CONFIRMED`.<br>- Đơn sau bị xung đột phiên bản JPA (`OptimisticLockingFailureException`), hệ thống thử lại nhưng nhận thấy ghế đã hết ($seatAvailable = 0$) $\rightarrow$ Báo lỗi `SEAT_NOT_AVAILABLE`, rollback an toàn, không bị âm ghế. | **P1** |
| **TC-DRI-011** | Tự động hết hạn duyệt vé (`EXPIRED`) | Đơn vé ở trạng thái `WAITING_DRIVER_APPROVAL` | 1. Quá thời hạn 120 phút (`BOOKING_DRIVER_APPROVAL_TIMEOUT`) mà tài xế không bấm duyệt hay từ chối.<br>2. Scheduler `BookingExpireScheduler` quét qua. | Quá hạn 120 phút | - Vé chuyển sang `EXPIRED`, lý do: "Tự động hủy: Quá thời hạn duyệt vé mà tài xế chưa phản hồi".<br>- Nếu là Stripe: tự động hủy giữ tiền (`PaymentStatus.VOIDED`). | **P2** |

---

### Test Suite 2.3: Xử lý Yêu cầu Đổi lộ trình từ Khách hàng
* **Mục tiêu:** Kiểm tra tài xế nhận thông báo so sánh Before/After và thực hiện phản hồi trong SLA 15 phút.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DRI-012** | Tài xế Chấp thuận đổi lộ trình mới | Khách đã gửi yêu cầu sửa vé (`PENDING_DRIVER`) | 1. Mở thông báo sửa vé trên Driver App.<br>2. Xem màn hình so sánh điểm đón cũ vs điểm đón mới.<br>3. Bấm **[Chấp thuận thay đổi]**. | Modification ID: `mod_01` | - Bản ghi đổi vé chuyển sang **`APPROVED`**.<br>- Thông tin điểm đón/trả mới được ghi đè vào Booking chính thức.<br>- Khách hàng nhận được thông báo "Tài xế đã đồng ý lộ trình mới". | **P1** |
| **TC-DRI-013** | Tài xế Từ chối đổi lộ trình mới | Khách đã gửi yêu cầu sửa vé (`PENDING_DRIVER`) | 1. Mở màn hình so sánh lộ trình.<br>2. Bấm **[Từ chối]** $\rightarrow$ Nhập lý do: "Ngược chiều đường cao tốc". | Lý do: "Ngược chiều cao tốc" | - Bản ghi đổi vé chuyển sang **`REJECTED`**.<br>- Vé gốc giữ nguyên lộ trình ban đầu.<br>- Khách nhận thông báo tài xế đã từ chối yêu cầu đổi lộ trình. | **P1** |

---

### Test Suite 2.4: Vận hành Chuyến xe (Started, Completed, Canceled & Vòng đời Tự động)
* **Mục tiêu:** Đảm bảo quy trình vận hành cuốc xe đúng tuần tự, không chạy xe rỗng và tự động hóa theo thời gian.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DRI-014** | Bắt đầu hành trình thành công (`STARTED`) | Chuyến xe `OPEN` hoặc `FULL`, có ít nhất 1 vé `CONFIRMED` | 1. Đến giờ chạy, tài xế bấm **[Bắt đầu chuyến đi]**. | Chuyến có 2 khách đã chốt | Chuyến xe chuyển trạng thái sang **`STARTED`**. Toàn bộ các vé `WAITING_DRIVER_APPROVAL` còn sót lại tự động bị hủy để khóa sổ. | **P1** |
| **TC-DRI-015** | Chặn bắt đầu chuyến xe khi không có khách (Xe rỗng) | Chuyến xe không có bất kỳ vé `CONFIRMED` nào ($seatAvailable == seatTotal$) | 1. Tài xế bấm **[Bắt đầu chuyến đi]**. | Khách = 0 | Hệ thống ném lỗi `CANNOT_START_WITHOUT_PASSENGERS` ("Không thể bắt đầu chuyến đi khi chưa có hành khách nào đặt chỗ thành công"). | **P1** |
| **TC-DRI-016** | Hoàn thành chuyến xe (`COMPLETED`) | Chuyến xe đang ở trạng thái `STARTED` | 1. Sau khi trả hết khách, tài xế bấm **[Hoàn thành chuyến đi]**. | Chuyến ID: `trip_001` | - Chuyến xe chuyển sang **`COMPLETED`**.<br>- Toàn bộ vé chuyển sang `COMPLETED`.<br>- Bắn Kafka `TripCompletedEvent` kích hoạt giải ngân tài chính và cấn trừ nợ. | **P1** |
| **TC-DRI-017** | Tài xế chủ động hủy chuyến (`CANCELED`) | Chuyến xe đang ở trạng thái `OPEN` hoặc `FULL` (chưa chạy) | 1. Tài xế bấm [Hủy chuyến xe].<br>2. Nhập lý do: "Xe gặp sự cố hỏng lốp bất ngờ".<br>3. Xác nhận hủy. | Lý do: "Hỏng xe" | - Chuyến xe chuyển `CANCELED`.<br>- Toàn bộ vé của khách chuyển `CANCELLED_DRIVER`.<br>- Khách dùng thẻ Stripe được hủy giữ tiền (`VOIDED`).<br>- Tài xế bị hệ thống ghi nhận vi phạm hủy chuyến. | **P1** |
| **TC-DRI-018** | Tự động Hủy chuyến do trễ giờ quá 1 tiếng | Chuyến xe ở trạng thái `OPEN`/`FULL`, quá 1 tiếng so với `departureTime` mà tài xế không bấm Start | 1. Chờ qua $departureTime + 1h$.<br>2. Job `TripLifecycleScheduler` quét qua. | Trễ $> 60$ phút | Chuyến xe tự động chuyển sang `CANCELED`. Toàn bộ vé chuyển sang `CANCELLED_DRIVER` và hoàn tiền/void tiền cho khách. | **P2** |
| **TC-DRI-019** | Tự động Hoàn tất chuyến xe sau 30 phút giờ đến dự kiến | Chuyến xe đang `STARTED`, quá 30 phút so với `arrivalTime` | 1. Chờ qua $arrivalTime + 30p$.<br>2. Job `TripLifecycleScheduler` quét qua. | Quá 30 phút sau giờ đến | Chuyến xe tự động chuyển sang `COMPLETED`, kích hoạt tiến trình giải ngân tài chính Payout tự động. | **P2** |

---

### Test Suite 2.5: Tài chính Tài xế & 3 Kịch bản Cấn trừ Nợ Tự động (FinTech)
* **Mục tiêu:** Kiểm tra cấn trừ nợ ví tiền mặt và gọi Stripe Connect Payout theo 3 kịch bản chuẩn xác.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-DRI-020** | Kịch bản 1: Tài xế không nợ sàn ($debt \le 0$) | Chuyến xe Stripe hoàn thành, hoa hồng sàn = 18%. Tài xế có $debt = 0$đ. | 1. Chuyến xe có 1 vé Stripe 200.000 đ chuyển `COMPLETED`.<br>2. `PayoutService` tiêu thụ sự kiện `BookingCompletedEvent`. | Vé: 200.000 đ<br>Thu nhập ($82\%$): 164.000 đ<br>Nợ cũ: 0 đ | - `debtDeducted = 0` đ.<br>- Gọi Stripe API `Transfer.create` chuyển 164.000 đ vào Stripe Connect của tài xế.<br>- `PayoutStatus = COMPLETED`.<br>- Dư nợ tài xế vẫn giữ nguyên là 0 đ. | **P1** |
| **TC-DRI-021** | Kịch bản 2: Dư nợ nhỏ hơn thu nhập cuốc xe ($0 < debt < income$) | Thu nhập cuốc xe = 164.000 đ. Dư nợ tiền mặt cũ của tài xế = 64.000 đ. | 1. Chuyến xe Stripe hoàn thành.<br>2. `PayoutService` xử lý thanh toán. | Thu nhập: 164.000 đ<br>Nợ cũ: 64.000 đ | - `debtDeducted = 64.000` đ (xóa sạch nợ cũ về 0 đ).<br>- `finalPayoutAmount = 164.000 - 64.000 = 100.000` đ.<br>- Gọi Stripe `Transfer.create` chuyển đúng 100.000 đ cho tài xế.<br>- `PayoutStatus = COMPLETED`.<br>- Bảng Ledger ghi nhận giao dịch cấn trừ nợ 64.000 đ. | **P1** |
| **TC-DRI-022** | Kịch bản 3: Dư nợ lớn hơn hoặc bằng thu nhập cuốc xe ($debt \ge income$) | Thu nhập cuốc xe = 164.000 đ. Dư nợ tiền mặt cũ = 300.000 đ. | 1. Chuyến xe Stripe hoàn thành.<br>2. `PayoutService` xử lý thanh toán. | Thu nhập: 164.000 đ<br>Nợ cũ: 300.000 đ | - `debtDeducted = 164.000` đ.<br>- `finalPayoutAmount = 0` đ.<br>- **Tuyệt đối không gọi Stripe Transfer API** (tránh lỗi chuyển $\le 0$đ).<br>- `PayoutStatus = FULL_DEBT_OFFSET`.<br>- `stripe_transfer_id = "N/A_FULL_OFFSET"`.<br>- Nợ mới của tài xế giảm còn $300.000 - 164.000 = 136.000$ đ. | **P1** |
| **TC-DRI-023** | Tài xế chưa liên kết Stripe Connect (`SKIPPED_NOT_ONBOARDED`) | Tài xế chuyến xe chưa hoàn tất liên kết Stripe (`stripePayoutsEnabled = false`) | 1. Chuyến xe Stripe hoàn tất. | Chưa onboard Stripe | - Hệ thống ghi nhận `PayoutStatus = SKIPPED_NOT_ONBOARDED`.<br>- Tiền thu từ khách được giữ an toàn trên tài khoản nền tảng, ghi nhận chờ tài xế liên kết sau. | **P2** |
| **TC-DRI-024** | Nạp tiền thanh toán nợ sàn chủ động | Dư nợ = 400.000 đ | 1. Mở Driver App $\rightarrow$ Mục Ví $\rightarrow$ [Thanh toán nợ sàn].<br>2. Nhập số tiền: 400.000 đ $\rightarrow$ Thanh toán qua cổng thanh toán.<br>3. Xác nhận giao dịch thành công. | Số tiền nạp: 400.000 đ | - API `/payments/wallet/confirm` xử lý thành công.<br>- Dư nợ giảm về 0 đ.<br>- Tài khoản được gỡ cờ chặn tạo chuyến ngay lập tức. | **P1** |

---

# PHẦN 3: TEST DESIGN DÀNH CHO TESTER 3 (ADMIN + CHAT REALTIME + AUTH & EKYC AI)

### Test Suite 3.1: Đăng ký, Đăng nhập & Xác thực Token (Auth & Identity)
* **Mục tiêu:** Kiểm tra đăng ký, đăng nhập JWT, phân quyền và dọn dẹp Refresh Token quá hạn.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-001** | Đăng ký tài khoản người dùng mới thành công | Số điện thoại và Email chưa tồn tại trong hệ thống | 1. Nhập Họ tên, Số điện thoại, Email, Mật khẩu.<br>2. Bấm [Đăng ký]. | Phone: `0987654321`<br>Email: `test@gmail.com` | Tài khoản được tạo thành công với vai trò mặc định `ROLE_CUSTOMER`. | **P1** |
| **TC-ADM-002** | Đăng nhập và nhận cặp Access Token & Refresh Token | Tài khoản đã tồn tại | 1. Nhập Số điện thoại/Email và Mật khẩu.<br>2. Bấm [Đăng nhập]. | Đúng mật khẩu | Trả về `accessToken` (JWT hạn 1 giờ) và `refreshToken` (hạn 30 ngày). | **P1** |
| **TC-ADM-003** | Tự động dọn dẹp Refresh Token hết hạn (`cleanUpExpiredTokens`) | Có các Refresh Token đã quá hạn 30 ngày trong bảng `invalidated_tokens` hoặc bảng lưu token | 1. Chạy Scheduler định kỳ vào 02:00 sáng hàng ngày (`AuthenticationService.cleanUpExpiredTokens`). | Token hết hạn | Toàn bộ các token quá hạn bị xóa sạch khỏi CSDL, giảm tải dung lượng bảng. | **P2** |
| **TC-ADM-004** | Chặn truy cập trái quyền (RBAC Protection) | Đăng nhập bằng tài khoản `ROLE_CUSTOMER` | 1. Gửi request gọi API Admin: `GET /api/v1/admin/audit-logs` kèm token của Khách. | Bearer Token của Customer | Gateway/Service trả về HTTP `403 Forbidden` do thiếu quyền `ROLE_ADMIN`. | **P1** |

---

### Test Suite 3.2: Module eKYC Sinh trắc học AI (`ai-service` MiniFASNet + FaceNet)
* **Mục tiêu:** Kiểm tra kiểm định thực thể sống (Anti-Spoofing) và so khớp khuôn mặt giữa chân dung selfie và ảnh CCCD.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-005** | eKYC thành công với người thật và ảnh CCCD trùng khớp | Ảnh chụp trực tiếp người thật, ảnh thẻ CCCD rõ nét chính chủ | 1. Tải lên ảnh mặt trước CCCD.<br>2. Chụp ảnh selfie trực tiếp.<br>3. Gọi API eKYC xác thực sinh trắc học. | Ảnh CCCD thật + Ảnh selfie thật cùng 1 người | - MiniFASNet xác định: Liveness = Real.<br>- FaceNet so khớp Cosine Similarity $\ge 0.65$ (ví dụ: 0.82).<br>- Trả về kết quả `VERIFIED`, cho phép nộp hồ sơ tài xế. | **P1** |
| **TC-ADM-006** | AI chặn hành vi giả mạo bằng ảnh in / màn hình (Liveness Failed) | Chuẩn bị ảnh in màu khuôn mặt hoặc chụp lại màn hình điện thoại | 1. Dùng camera quét bức ảnh in hoặc màn hình máy tính.<br>2. Gọi API eKYC. | Ảnh in trên giấy A4 | MiniFASNet phát hiện tấn công giả mạo (Spoofing Detected) $\rightarrow$ Trả về lỗi `FACE_LIVENESS_FAILED`, từ chối nhận hồ sơ. | **P1** |
| **TC-ADM-007** | AI chặn khi ảnh selfie khác người trên thẻ CCCD (Face Mismatch) | Lấy CCCD của người A và ảnh selfie của người B | 1. Tải CCCD người A.<br>2. Chụp selfie người B.<br>3. Gọi API eKYC. | CCCD người A + Selfie người B | FaceNet trích xuất vector, tính Cosine Similarity $< 0.65$ (ví dụ: 0.35) $\rightarrow$ Ném lỗi `FACE_MISMATCH` ("Khuôn mặt chụp trực tiếp không khớp với ảnh trên CCCD"). | **P1** |

---

### Test Suite 3.3: Thẩm định Tài xế & Phương tiện trên Web Admin (`rideUpMicroUi`)
* **Mục tiêu:** Kiểm tra quy trình duyệt hồ sơ tài xế, duyệt xe và kiểm tra tính độc lập/ràng buộc giữa hai tiến trình.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-008** | Duyệt hồ sơ tài xế (`POST /drivers/{id}/approve`) | Tài xế đã nộp hồ sơ ở trạng thái `PENDING` | 1. Admin mở trang Danh sách tài xế chờ duyệt.<br>2. Xem ảnh CCCD, GPLX, ảnh chụp AI.<br>3. Bấm **[Phê duyệt]**. | Driver ID: `drv_123` | - `driverProfile.status` chuyển sang **`APPROVED`**.<br>- Lưu `approvedBy = admin@rideup.vn`, `approvedAt = now`.<br>- Ghi log kiểm toán `AdminAuditLogService`.<br>- **Lưu ý: Phương tiện của tài xế này vẫn ở trạng thái chưa duyệt (`isVerified = false`)**. | **P1** |
| **TC-ADM-009** | Từ chối hồ sơ tài xế kèm lý do | Tài xế nộp giấy tờ bị mờ | 1. Admin bấm **[Từ chối]** $\rightarrow$ Nhập lý do: "Ảnh GPLX bị lóa sáng mất số bằng". | Lý do: "Ảnh GPLX bị lóa" | - `driverProfile.status` chuyển sang **`REJECTED`**.<br>- Tài xế nhận thông báo và có thể nộp lại hồ sơ. | **P1** |
| **TC-ADM-010** | Chặn đăng ký hoặc duyệt xe khi tài xế chưa được duyệt | Tài xế có `driverProfile.status = PENDING` | 1. Thực hiện gọi API đăng ký xe hoặc duyệt xe cho tài xế này. | Tài xế `PENDING` | Hệ thống ném lỗi `ErrorCode.DRIVER_NOT_APPROVED` ("Hồ sơ tài xế chưa được phê duyệt"), không cho phép duyệt xe. | **P1** |
| **TC-ADM-011** | Phê duyệt phương tiện (`POST /vehicles/{id}/approve`) | Tài xế đã `APPROVED`, xe nộp đủ Cavet và Bảo hiểm | 1. Admin mở trang Duyệt phương tiện.<br>2. Kiểm tra ảnh Cavet 2 mặt và hạn Bảo hiểm TNDS.<br>3. Bấm **[Phê duyệt xe]**. | Vehicle ID: `veh_456` | - `vehicle.isVerified = true`, `vehicle.isActive = true`.<br>- Lưu thông tin người duyệt và thời gian duyệt.<br>- Tài xế lúc này mới đạt trạng thái "Active toàn diện". | **P1** |
| **TC-ADM-012** | Kiểm chứng: Chỉ duyệt 1 trong 2 không thể tạo chuyến xe | Trường hợp A: Tài xế `APPROVED`, Xe chưa duyệt.<br>Trường hợp B: Xe duyệt, Tài xế bị khóa. | 1. Dùng tài khoản tài xế ở Trường hợp A thực hiện tạo chuyến xe (`POST /trips`). | Tài xế duyệt, Xe chưa duyệt | Hệ thống kiểm tra: `!driver.getIsVehicleVerified()` $\rightarrow$ Ném ngoại lệ `ErrorCode.VEHICLE_NOT_VERIFIED`, **chặn đứng không cho tạo chuyến**. Khẳng định bắt buộc cả hai cùng được duyệt mới active. | **P1** |

---

### Test Suite 3.4: Chat Thời gian thực (WebSocket STOMP) & Thông báo
* **Mục tiêu:** Kiểm tra phòng chat gắn theo mã đặt vé `bookingId` và truyền nhận tin nhắn tức thì.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-013** | Kết nối WebSocket STOMP và gửi nhận tin nhắn 2 chiều | Vé ở trạng thái `WAITING_DRIVER_APPROVAL` hoặc `CONFIRMED` | 1. Khách hàng mở phòng chat của vé `bk_100` $\rightarrow$ Kết nối endpoint `/ws`.<br>2. Tài xế mở phòng chat của cùng vé `bk_100`.<br>3. Khách gửi: "Tôi đang đứng ở đối diện cổng trường". | Kênh subscribe: `/topic/booking/bk_100`<br>Tin nhắn: "Tôi đang đứng đối diện cổng" | - Tài xế nhận tin nhắn ngay lập tức trên màn hình chat với độ trễ $< 500$ms.<br>- Tin nhắn được lưu vào MongoDB của `chat_service`.<br>- Khi thoát ra vào lại vẫn hiển thị đầy đủ lịch sử chat. | **P1** |
| **TC-ADM-014** | Chặn gửi tin nhắn trên cuốc xe đã đóng / không liên quan | Tài khoản User C không phải là khách hay tài xế của vé `bk_100` | 1. User C cố tình kết nối và gửi tin vào phòng chat của `bk_100`. | User C không thuộc vé | Hệ thống chặn hoặc từ chối phát sóng tin nhắn do không hợp lệ về mặt quyền hạn. | **P2** |

---

### Test Suite 3.5: Cấu hình Tham số SLA Động & Quản lý Tài chính trên Web Admin
* **Mục tiêu:** Kiểm tra Admin thay đổi 5 tham số SLA động và cấu hình hoa hồng cá nhân hóa.

| Test Case ID | Tên Test Case | Điều kiện tiên quyết | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Mức độ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-015** | Cập nhật tham số SLA Hủy vé (`CUSTOMER_CANCEL_CUTOFF`) | Admin đăng nhập Web Admin | 1. Vào trang Cấu hình SLA Động.<br>2. Đổi giá trị `CUSTOMER_CANCEL_CUTOFF` từ 120 phút thành 60 phút.<br>3. Bấm [Lưu cấu hình]. | `CUSTOMER_CANCEL_CUTOFF`: 60 | - Giá trị được lưu vào Redis/MySQL.<br>- Phát sự kiện Kafka `system-config-changed`.<br>- Khách hàng lúc này có thể hủy vé trước giờ chạy 1 tiếng mà không bị chặn ở mốc 2 tiếng như trước. | **P1** |
| **TC-ADM-016** | Cập nhật cấu hình Tỷ lệ Hoa hồng sàn (Commission Config) | Admin đăng nhập Web Admin | 1. Vào trang Cấu hình Hoa hồng.<br>2. Đổi `baseRate` thành $15\%$, `creditLimit` thành 800.000 đ.<br>3. Bấm [Lưu cấu hình]. | `baseRate`: 0.15<br>`creditLimit`: 800000 | - Các cuốc xe hoàn thành tiếp theo sẽ tính theo tỷ lệ cơ sở $15\%$.<br>- Tài xế có nợ đến 750.000 đ vẫn được tạo chuyến (chỉ bị chặn khi nợ $\ge 800.000$ đ). | **P1** |
| **TC-ADM-017** | Kiểm tra hiển thị Bảng theo dõi Nợ tài xế (Debt Ledger) | Đã có các giao dịch cấn trừ nợ thực tế phát sinh | 1. Admin mở trang Quản lý Nợ tài xế.<br>2. Xem danh sách dư nợ hiện tại, điểm uy tín, rating của từng tài xế. | Danh sách tài xế | Hiển thị chính xác số dư nợ hiện tại (`systemDebt`), lịch sử từng giao dịch cấn trừ tiền mặt/thẻ từ `debt_ledger`. | **P2** |

---

## HƯỚNG DẪN BẮT ĐẦU DÀNH CHO 3 TESTER (EXECUTION CHECKLIST)

### Đối với Tester 1 (Module Khách hàng):
1. Cài đặt và chạy `rideup-customer-app` trên thiết bị thật hoặc máy ảo Android/iOS.
2. Chuẩn bị thẻ Test Stripe (`4242 4242 4242 4242`, CVC bất kỳ, Date tương lai).
3. Tập trung chạy kiểm thử theo thứ tự: Tìm chuyến $\rightarrow$ Đặt vé Tiền mặt/Stripe $\rightarrow$ Đổi lộ trình (cả 2 kịch bản tự động và chờ duyệt) $\rightarrow$ Hủy vé trước/sau mốc 2 tiếng $\rightarrow$ Đăng tìm xe trên Chợ $\rightarrow$ Đánh giá Rating.
4. Đối soát giá trị Rating sau đánh giá: đảm bảo công thức là trung bình cộng số học ($R = \frac{\sum Stars}{N}$), không có độ trễ hay làm mịn ảo.

### Đối với Tester 2 (Module Tài xế):
1. Cài đặt và chạy `rideup-driver-app`. Đăng nhập tài khoản tài xế đã được Admin duyệt.
2. Kiểm tra điều kiện nợ ví và điểm uy tín trước khi test tạo chuyến.
3. Thử nghiệm tạo chuyến với các mức giá cực thấp/cực cao để xác nhận chặn phá giá/đội giá theo km.
4. Mở 2 thiết bị cùng lúc để kiểm tra tranh chấp duyệt chiếc ghế cuối cùng (Optimistic Locking).
5. Thực hiện trọn vẹn 3 kịch bản hoàn thành chuyến để kiểm tra cấn trừ nợ:
   - Kịch bản 1: Nợ = 0 đ $\rightarrow$ Stripe Transfer 100%.
   - Kịch bản 2: Nợ = 64k, Thu nhập = 164k $\rightarrow$ Trừ nợ 64k, Transfer 100k.
   - Kịch bản 3: Nợ = 300k, Thu nhập = 164k $\rightarrow$ Cấn trừ 164k, Transfer = 0đ (không gọi Stripe API), nợ mới = 136k.

### Đối với Tester 3 (Module Admin + Chat + Auth & eKYC AI):
1. Khởi chạy `ai-service` (FastAPI) và `rideUpMicroUi` (React Vite Admin).
2. Thử nghiệm eKYC với các trường hợp: mặt thật, ảnh chụp màn hình điện thoại (để test Anti-Spoofing), ảnh selfie khác người trên CCCD.
3. Thực hiện thẩm định độc lập: thử chỉ duyệt tài xế rồi dùng tài xế đó tạo chuyến để xác nhận lỗi `VEHICLE_NOT_VERIFIED`. Sau đó duyệt tiếp phương tiện để xác nhận tài xế hoạt động bình thường.
4. Mở 2 tab/thiết bị để kiểm tra phòng chat WebSocket STOMP truyền nhận tin nhắn theo mã vé `bookingId`.
5. Thử thay đổi các mốc SLA trong trang Admin và kiểm tra sự thay đổi tức thì ở Customer App và Driver App.
