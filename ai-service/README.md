# RideUp AI Service - Driver Face Verification & Anti-Spoofing

Microservice AI phục vụ xác minh danh tính và chống giả mạo khuôn mặt (Liveness Detection) cho tài xế trong hệ thống **RideUpMicro**, xây dựng bằng **FastAPI**, **FaceNet (InceptionResnetV1)**, và **MiniFASNet**, tích hợp trực tiếp với **Spring Cloud Eureka Discovery Server**.

---

## 1. Tính năng chính
* **Phát hiện khuôn mặt:** Sử dụng mô hình RetinaFace (Caffe DNN).
* **Chống giả mạo (Anti-Spoofing / Passive Liveness):** Sử dụng tổ hợp mô hình MiniFASNet để phát hiện ảnh chụp lại qua màn hình điện thoại, máy tính hoặc ảnh in trên giấy.
* **Trích xuất đặc trưng (Feature Extraction):** Trích xuất vector đặc trưng 512 chiều chuẩn hóa từ ảnh khuôn mặt.
* **Xác thực 1:1 (Verification):** So khớp Cosine Similarity giữa ảnh selfie điểm danh với vector gốc trong CSDL của `identity-service`.
* **So khớp 2 ảnh (Comparison):** So sánh ảnh thẻ CCCD với ảnh selfie lúc nộp hồ sơ eKYC.
* **Tích hợp Eureka Discovery Server:** Tự động đăng ký với Spring Cloud Eureka (`lb://ai-service`).

---

## 2. Hướng dẫn chạy dịch vụ

### Cách 1: Chạy trực tiếp trên máy (Virtual Environment)
```powershell
# Di chuyển vào thư mục ai-service
cd ai-service

# Tạo và kích hoạt môi trường ảo Python
python -m venv venv
.\venv\Scripts\activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# Khởi động dịch vụ
python app.py
```
* Dịch vụ mặc định chạy tại: `http://localhost:8000`
* Swagger UI tương tác trực tiếp: `http://localhost:8000/docs`

### Cách 2: Chạy bằng Docker
```bash
docker build -t rideup-ai-service .
docker run -p 8000:8000 --name ai-service rideup-ai-service
```

---

## 3. Cấu hình biến môi trường (.env)
| Biến | Giá trị mặc định | Giải thích |
| :--- | :--- | :--- |
| `SERVER_PORT` | `8000` | Cổng HTTP của AI Service |
| `SERVER_HOST` | `0.0.0.0` | Host lắng nghe |
| `APP_NAME` | `ai-service` | Tên service đăng ký trên Eureka Server |
| `EUREKA_SERVER` | `http://localhost:8761/eureka` | Địa chỉ Eureka Discovery Server |
| `ENABLE_EUREKA` | `true` | Bật/tắt tự động đăng ký Eureka |
| `DEFAULT_SIMILARITY_THRESHOLD` | `0.65` | Ngưỡng tương đồng cosine similarity (0.65 = 65%) |

---

## 4. Danh sách API Endpoints

### 📌 1. Healthcheck
* **Method:** `GET /api/ai/health` (hoặc `/health`)
* **Response:**
```json
{
  "status": "UP",
  "service": "ai-service",
  "models_loaded": 2,
  "eureka_registered": true
}
```

### 📌 2. Trích xuất vector khi đăng ký tài xế (eKYC)
* **Method:** `POST /api/ai/extract-embedding`
* **Request Body:**
```json
{
  "image_base64": "<chuoi_base64_anh_selfie>",
  "check_liveness": true
}
```
* **Response:**
```json
{
  "status": "success",
  "is_real": true,
  "liveness_score": 98.45,
  "embedding": [0.0124, -0.0531, ...],
  "message": "Trích xuất vector khuôn mặt thành công"
}
```

### 📌 3. Xác minh tài xế điểm danh / bật online (1:1)
* **Method:** `POST /api/ai/verify-driver`
* **Request Body:**
```json
{
  "image_base64": "<chuoi_base64_anh_selfie_luc_bat_app>",
  "target_embedding": [0.0124, -0.0531, ...],
  "threshold": 0.65
}
```
* **Response:**
```json
{
  "status": "success",
  "is_real": true,
  "is_verified": true,
  "liveness_score": 97.2,
  "similarity": 88.5,
  "threshold": 65.0,
  "message": "Xác thực danh tính tài xế thành công"
}
```

### 📌 4. So sánh trực tiếp 2 ảnh (CCCD vs Selfie)
* **Method:** `POST /api/ai/compare-faces`
* **Request Body:**
```json
{
  "image1_base64": "<anh_cccd>",
  "image2_base64": "<anh_selfie>",
  "threshold": 0.65,
  "check_liveness": true
}
```
