# 🚗 HỆ THỐNG RIDEUP MICROSERVICES - HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

Tài liệu này hướng dẫn chi tiết các bước chuẩn bị môi trường, nạp cơ sở dữ liệu và thứ tự khởi chạy toàn bộ hệ sinh thái **RideUpMicro** (bao gồm Backend Microservices, AI Service, Web Admin và Ứng dụng Di động).

---

## 📌 1. Bảng Tổng Hợp Cổng Mạng (Ports) & Dịch Vụ

| Dịch vụ | Công nghệ | Cổng (Port) | Vai trò chính |
| :--- | :--- | :--- | :--- |
| **discovery-server** | Spring Cloud Netflix Eureka | `8761` | Service Registry & Discovery Server |
| **api-gateway** | Spring Cloud Gateway | `8080` | Điểm truy cập duy nhất, định tuyến & Rate Limiting |
| **ai-service** | Python FastAPI / PyTorch | `8000` | Anti-Spoofing & Xác thực khuôn mặt sinh trắc học |
| **identity-service** | Spring Boot / MySQL | `8081` | Quản lý Tài khoản, Phân quyền & Hồ sơ Tài xế |
| **locationservice** | Spring Boot / MySQL | `8082` | Quản lý Địa điểm, Tọa độ GPS & Định tuyến |
| **trip-service** | Spring Boot / MySQL | `8083` | Quản lý Chuyến đi, Điểm đón/trả & Ghế ngồi |
| **booking-service** | Spring Boot / MySQL | `8084` | Xử lý Đặt vé, Phê duyệt & Hủy chuyến |
| **payment-service** | Spring Boot / MySQL | `8085` | Tích hợp Stripe / VNPay & Thanh toán |
| **notification-service** | Spring Boot / Kafka / Mail | `8086` | Gửi Email thông báo & Push Notifications |
| **chat_service** | Spring Boot / WebSocket | `8087` | Nhắn tin thời gian thực giữa Tài xế & Khách |
| **review-service** | Spring Boot / MySQL | `8089` | Đánh giá & Xếp hạng chuyến đi |
| **rideUpMicroUi** | React / Vite / TailwindCSS | `5173` | Giao diện Web Quản trị Admin & Khách hàng |
| **rideup-driver-app** | React Native / Expo | Metro (`19002`) | Ứng dụng Di động dành cho Tài xế (Android/iOS) |
| **rideup-customer-app** | React Native / Expo | Metro (`19001`) | Ứng dụng Di động dành cho Khách hàng (Android/iOS) |

---

## ⚙️ 2. Yêu cầu Môi trường

* **Java:** JDK 17 trở lên (`java -version`).
* **Maven:** 3.8+ (`mvn -version`).
* **Python:** 3.10 – 3.12 (`python --version`).
* **Node.js:** v18+ & npm (`node --version`).
* **MySQL:** Chạy ở cổng `3306` (Mặc định `user: root`, `password: Hung23072004`).
* **Redis:** Đã kết nối tự động đến dịch vụ Cloud (Aiven) cấu hình sẵn trong project.

---

## 🗄️ 3. Khởi tạo Cơ sở Dữ liệu (MySQL)

Nạp file `sqlDump.sql` ở thư mục gốc vào MySQL:
```powershell
mysql -u root -p < d:\do_an\RideUpMicro\sqlDump.sql
```
*(Hoặc dùng MySQL Workbench / Navicat / DBeaver mở file `sqlDump.sql` và nhấn Run/Execute).*

---

## 🚀 4. Thứ tự Khởi chạy Hệ thống

> ⚠️ **LƯU Ý:** Bắt buộc khởi động **Discovery Server** trước tiên để các dịch vụ khác có thể đăng ký tìm kiếm nhau.

### 🟢 Bước 4.1: Khởi động Discovery Server (Eureka Registry)
Mở Terminal 1:
```powershell
cd d:\do_an\RideUpMicro\discovery-server
mvn spring-boot:run
```
* **Dashboard:** [http://localhost:8761](http://localhost:8761)

---

### 🧠 Bước 4.2: Khởi động AI Service (FastAPI)
Mở Terminal 2:
```powershell
cd d:\do_an\RideUpMicro\ai-service

# Tạo và kích hoạt môi trường ảo Python (chỉ làm 1 lần đầu)
python -m venv venv
.\venv\Scripts\activate

# Cài đặt thư viện AI (chỉ làm 1 lần đầu)
pip install -r requirements.txt

# Khởi chạy dịch vụ
python app.py
```
* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Healthcheck:** [http://localhost:8000/api/ai/health](http://localhost:8000/api/ai/health)

---

### 🛡️ Bước 4.3: Khởi động Identity Service (Xác thực & Tài xế)
Mở Terminal 3:
```powershell
cd d:\do_an\RideUpMicro\identity-service
mvn spring-boot:run
```
* Port: `8081` (Context path: `/api/identity`)

---

### 🌐 Bước 4.4: Khởi động API Gateway
Mở Terminal 4:
```powershell
cd d:\do_an\RideUpMicro\api-gateway
mvn spring-boot:run
```
* Port: `8080` (Điều phối toàn bộ API)

---

### 📦 Bước 4.5: Khởi động các Service Nghiệp vụ khác (Tùy nhu cầu test)
Mở từng tab Terminal cho mỗi dịch vụ:
* **Location Service:** `cd d:\do_an\RideUpMicro\locationservice` ➡️ `mvn spring-boot:run`
* **Trip Service:** `cd d:\do_an\RideUpMicro\trip-service` ➡️ `mvn spring-boot:run`
* **Booking Service:** `cd d:\do_an\RideUpMicro\booking-service` ➡️ `mvn spring-boot:run`
* **Payment Service:** `cd d:\do_an\RideUpMicro\payment-service` ➡️ `mvn spring-boot:run`
* **Notification Service:** `cd d:\do_an\RideUpMicro\notification-service\notification-service` ➡️ `mvn spring-boot:run`
* **Chat Service:** `cd d:\do_an\RideUpMicro\chat_service` ➡️ `mvn spring-boot:run`
* **Review Service:** `cd d:\do_an\RideUpMicro\review-service` ➡️ `mvn spring-boot:run`

---

## 💻 5. Khởi chạy Giao diện (Frontend & Mobile)

### 🖥️ 5.1. Web Quản trị Admin & Khách hàng (`rideUpMicroUi`)
Mở Terminal:
```powershell
cd d:\do_an\RideUpMicro\rideUpMicroUi
npm install
npm run dev
```
* **Truy cập:** [http://localhost:5173](http://localhost:5173)

---

### 📱 5.2. Ứng dụng Di động Tài xế (`rideup-driver-app`)
Mở Terminal:
```powershell
cd d:\do_an\RideUpMicro\rideup-driver-app
npm install
npm start
```
* Nhấn `a` để mở Android Emulator hoặc quét mã QR bằng ứng dụng **Expo Go** trên điện thoại.
* *(Ghi chú: Lệnh `npm start` sẽ tự động chạy cổng `19002` để không bị đụng cổng `8081` của Identity Service).*

---

### 📱 5.3. Ứng dụng Di động Khách hàng (`rideup-customer-app`)
Mở Terminal:
```powershell
cd d:\do_an\RideUpMicro\rideup-customer-app
npm install
npm start
```
* *(Ghi chú: Lệnh `npm start` sẽ tự động chạy cổng `19001` để không bị đụng cổng).*

---

## 🧪 6. Kiểm tra Nhanh Tích hợp (Smoke Test)

1. **Kiểm tra Eureka Dashboard:** [http://localhost:8761](http://localhost:8761)
   Các dịch vụ `API-GATEWAY`, `AI-SERVICE`, `IDENTITY-SERVICE` phải ở trạng thái `UP`.
2. **Kiểm tra AI Service qua Gateway:**
   ```http
   GET http://localhost:8080/api/ai/health
   ```
   Kết quả trả về:
   ```json
   {
     "status": "UP",
     "service": "ai-service",
     "models_loaded": 2,
     "eureka_registered": true
   }
   ```
3. **Kiểm tra API Sinh trắc học của Tài xế:**
   * Lấy trạng thái điểm danh: `GET http://localhost:8080/api/identity/drivers/face/status`
   * Đăng ký khuôn mặt eKYC: `POST http://localhost:8080/api/identity/drivers/face/enroll`
   * Điểm danh quét mặt: `POST http://localhost:8080/api/identity/drivers/face/verify`
   * Đối chiếu 2 ảnh khuôn mặt: `POST http://localhost:8080/api/identity/drivers/face/compare`
