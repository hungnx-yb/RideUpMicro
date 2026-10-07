# 🚗 HỆ THỐNG RIDEUP MICROSERVICES - HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

> Tài liệu hướng dẫn chi tiết các bước chuẩn bị môi trường, nạp cơ sở dữ liệu và thứ tự khởi chạy toàn bộ hệ sinh thái **RideUpMicro** (bao gồm Backend Microservices, AI Service, Web Admin và Ứng dụng Di động).

---

## 📌 Bảng Tổng Hợp Cổng Mạng (Ports) & Dịch Vụ

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
| **rideup-driver-app** | React Native / Expo | Metro (`8081`) | Ứng dụng Di động dành cho Tài xế |
| **rideup-customer-app** | React Native / Expo | Metro (`8081`) | Ứng dụng Di động dành cho Khách hàng |

---

## ⚙️ 1. Yêu cầu Môi trường Cần cài đặt

1. **Java Development Kit (JDK):** Java 17 trở lên (`java -version`).
2. **Apache Maven:** 3.8+ (`mvn -version`).
3. **Python:** Python 3.10 – 3.12 (`python --version`).
4. **Node.js:** Node v18+ & npm (`node --version`).
5. **Cơ sở dữ liệu:** MySQL Server (cổng `3306`).
   * Tài khoản mặc định: `username: root`, `password: Hung23072004` (hoặc điều chỉnh trong từng file `application.yaml`).
6. **Redis:** Đã kết nối tự động lên Cloud Redis (Aiven) theo cấu hình sẵn trong mã nguồn.

---

## 🗄️ 2. Khởi tạo Cơ sở Dữ liệu (MySQL)

Hệ thống có file kịch bản SQL tổng hợp tại thư mục gốc: `sqlDump.sql`.

Mở terminal hoặc MySQL Workbench / Navicat và chạy:
```powershell
# Đăng nhập vào MySQL và import dữ liệu
mysql -u root -p < d:\do_an\RideUpMicro\sqlDump.sql
```
*(Hoặc mở file `sqlDump.sql` trong MySQL Workbench và nhấn **Execute** để nạp cấu trúc bảng và dữ liệu mẫu).*

---

## 🚀 3. Thứ tự Khởi chạy Hệ thống (Từng Bước)

> **QUAN TRỌNG:** Trong kiến trúc Microservices, bạn **bắt buộc** phải khởi động `discovery-server` đầu tiên để các dịch vụ khác có thể đăng ký vào hệ thống.

---

### 🟢 Bước 3.1: Khởi động Discovery Server (Eureka Registry)
*Mở Cửa sổ Terminal 1:*
```powershell
cd d:\do_an\RideUpMicro\discovery-server
mvn spring-boot:run
```
* **URL Eureka Dashboard:** [http://localhost:8761](http://localhost:8761)
* Đợi thông báo `Started DiscoveryServerApplication` trước khi chạy các bước sau.

---

### 🧠 Bước 3.2: Khởi động AI Service (FastAPI)
*Mở Cửa sổ Terminal 2:*
```powershell
cd d:\do_an\RideUpMicro\ai-service

# Tạo và kích hoạt môi trường ảo Python (chỉ làm 1 lần đầu)
python -m venv venv
.\venv\Scripts\activate

# Cài đặt các thư viện Deep Learning & FastAPI
pip install -r requirements.txt

# Khởi động dịch vụ
python app.py
```
* **Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check:** [http://localhost:8000/api/ai/health](http://localhost:8000/api/ai/health)
* Khi khởi động thành công, log sẽ hiển thị: `[Eureka] Đăng ký thành công với Eureka Server tại http://localhost:8761/eureka`.

---

### 🛡️ Bước 3.3: Khởi động Identity Service (Xác thực & Tài xế)
*Mở Cửa sổ Terminal 3:*
```powershell
cd d:\do_an\RideUpMicro\identity-service
mvn spring-boot:run
```
* Dịch vụ chạy trên cổng `8081` (Context-path: `/api/identity`).
* Tự động kết nối với `ai-service` qua OpenFeign để xác thực sinh trắc học khuôn mặt.

---

### 🌐 Bước 3.4: Khởi động API Gateway (Cổng điều phối trung tâm)
*Mở Cửa sổ Terminal 4:*
```powershell
cd d:\do_an\RideUpMicro\api-gateway
mvn spring-boot:run
```
* Cổng: `8080`.
* Định tuyến toàn bộ API từ bên ngoài vào:
  * `/api/identity/**` ➡️ `identity-service`
  * `/api/ai/**` ➡️ `ai-service`
  * `/api/location/**` ➡️ `locationservice`
  * `/api/trips/**` ➡️ `trip-service`
  * `/api/booking/**` ➡️ `booking-service`
  * `/api/payment/**` ➡️ `payment-service`

---

### 📦 Bước 3.5: Khởi động các Microservices Nghiệp vụ khác (Tùy theo nhu cầu test)
Mở các terminal riêng biệt cho từng service bạn muốn test:

* **Location Service:**
  ```powershell
  cd d:\do_an\RideUpMicro\locationservice
  mvn spring-boot:run
  ```
* **Trip Service:**
  ```powershell
  cd d:\do_an\RideUpMicro\trip-service
  mvn spring-boot:run
  ```
* **Booking Service:**
  ```powershell
  cd d:\do_an\RideUpMicro\booking-service
  mvn spring-boot:run
  ```
* **Payment Service:**
  ```powershell
  cd d:\do_an\RideUpMicro\payment-service
  mvn spring-boot:run
  ```
* **Notification Service:**
  ```powershell
  cd d:\do_an\RideUpMicro\notification-service\notification-service
  mvn spring-boot:run
  ```
* **Chat Service:**
  ```powershell
  cd d:\do_an\RideUpMicro\chat_service
  mvn spring-boot:run
  ```
* **Review Service:**
  ```powershell
  cd d:\do_an\RideUpMicro\review-service
  mvn spring-boot:run
  ```

---

## 💻 4. Khởi chạy Giao diện Người dùng (Frontend)

### 🖥️ 4.1. Web Quản trị Admin & Khách hàng (`rideUpMicroUi`)
*Mở Cửa sổ Terminal:*
```powershell
cd d:\do_an\RideUpMicro\rideUpMicroUi

# Cài đặt thư viện (nếu chưa cài)
npm install

# Khởi chạy Vite Dev Server
npm run dev
```
* **Truy cập:** [http://localhost:5173](http://localhost:5173)
* **Tính năng:** Đăng nhập, duyệt hồ sơ tài xế có kiểm tra sinh trắc học eKYC AI, quản lý xe, đặt chuyến đi.

---

### 📱 4.2. Ứng dụng Di động Tài xế (`rideup-driver-app`)
*Mở Cửa sổ Terminal:*
```powershell
cd d:\do_an\RideUpMicro\rideup-driver-app

# Cài đặt thư viện
npm install

# Khởi chạy ứng dụng
npx expo start
```
* **Sử dụng:**
  * Nhấn phím `a` để mở trên Android Emulator.
  * Hoặc mở camera điện thoại quét mã QR qua app **Expo Go**.
* **Tính năng nổi bật:**
  * Điểm danh sinh trắc học AI (Anti-Spoofing Passive Liveness & Face Verification).
  * Chốt chặn an toàn: Bắt buộc quét khuôn mặt hợp lệ trong ngày trước khi phê duyệt nhận khách.

---

### 📱 4.3. Ứng dụng Di động Khách hàng (`rideup-customer-app`)
*Mở Cửa sổ Terminal:*
```powershell
cd d:\do_an\RideUpMicro\rideup-customer-app

npm install
npx expo start
```

---

## 🧪 5. Kiểm tra Tích hợp Nhanh (Smoke Test)

1. **Kiểm tra Eureka Dashboard:**
   Truy cập [http://localhost:8761](http://localhost:8761), kiểm tra bảng `Instances currently registered with Eureka` có đầy đủ các dịch vụ đang ở trạng thái `UP`:
   * `API-GATEWAY`
   * `AI-SERVICE`
   * `IDENTITY-SERVICE`

2. **Kiểm tra định tuyến Gateway tới AI Service:**
   Mở trình duyệt hoặc Postman:
   ```http
   GET http://localhost:8080/api/ai/health
   ```
   Kết quả trả về JSON mẫu:
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

---

## 🛠️ 6. Xử lý các Sự cố Thường gặp (Troubleshooting)

| Lỗi gặp phải | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| `Cannot connect to Eureka Server` | `discovery-server` chưa khởi động hoặc chưa sẵn sàng | Chạy `discovery-server` trước và đợi port `8761` hoạt động. |
| `Torch / CUDA / DLL load failed` | Thiếu Visual C++ Redistributable trên Windows | Cài đặt gói **Visual C++ 2015-2022 Redistributable (x64)** từ Microsoft. |
| `Port 8080 / 8081 already in use` | Tiến trình cũ chưa tắt | Chạy PowerShell: `netstat -ano \| findstr :8080` rồi `taskkill /PID <PID> /F`. |
| App di động báo lỗi `Network Error` | Thiết bị thật không kết nối được `localhost` máy tính | Đảm bảo điện thoại và máy tính chung một mạng Wi-Fi; kiểm tra file `api.js` đã nhận IP LAN dạng `192.168.x.x`. |
