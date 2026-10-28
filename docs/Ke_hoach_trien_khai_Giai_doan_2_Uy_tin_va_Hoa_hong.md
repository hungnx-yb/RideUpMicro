# 📋 BÁO CÁO NGHIỆP VỤ & KẾ HOẠCH TRIỂN KHAI CHI TIẾT — GIAI ĐOẠN 2
# HỆ THỐNG ĐIỂM UY TÍN (REPUTATION SCORE) & TÍNH HOA HỒNG ĐỘNG CÁ NHÂN HÓA (12% - 25%)

> **Dự án:** RideUpMicro | **Module phụ trách chính:** `identity-service`  
> **Tài liệu tham chiếu:** REQ-P3-02 trong `Cải tiến phase 3.md`  
> **Mục tiêu tài liệu:** Làm rõ vấn đề nhức nhối hiện tại, định hình bài toán nghiệp vụ dễ hiểu, chuẩn hóa công thức toán học (trực quan, không lỗi hiển thị), và vạch ra giải pháp kỹ thuật tối giản, chặt chẽ (không dư thừa trường dữ liệu).

---

## 📌 PHẦN 1: BỐI CẢNH & VẤN ĐỀ BAN ĐẦU (TẠI SAO PHẢI LÀM?)

### 1.1. Hiện trạng hệ thống (As-Is)
Hiện nay, trong [IdentityServiceConsumer.java](file:///c:/WorkSpace/RideUp/RideUpMicro/identity-service/src/main/java/com/example/demo/kafka/consumer/IdentityServiceConsumer.java), mỗi khi cuốc xe hoàn thành (`booking-completed`), hệ thống đang áp dụng **một công thức gán cứng duy nhất (Hardcode)**:
```java
BigDecimal commission = event.getTotalAmount().multiply(new BigDecimal("0.20"));
```
Nghĩa là: **Bất kể tài xế là ai, phục vụ ra sao, nền tảng đều thu cào bằng đúng 20% tiền vé.**

### 1.2. Những bất cập nghiêm trọng trong vận hành thực tế
1. **Thiếu công bằng đối với tài xế tốt:**
   * Một bác tài lái xe cẩn thận, xe sạch sẽ, luôn đón đúng giờ, nhận đánh giá 5 sao tuyệt đối và không bao giờ hủy cuốc... vẫn phải nộp 20% hoa hồng như mọi người khác.
   * Hệ quả: Tài xế có tay nghề cao không thấy được sự đãi ngộ của sàn, dễ nảy sinh tâm lý rủ khách "bắt ngoài" (hủy chuyến trên app để ăn trọn tiền mặt).
2. **Không có chế tài kinh tế đối với tài xế xấu:**
   * Những tài xế hay hủy chuyến cận giờ khi thấy cuốc không thơm, thái độ phục vụ kém khiến khách bức xúc chấm 1-2 sao... vẫn chỉ nộp đúng 20%.
   * Hệ quả: Nền tảng RideUp phải chịu tổn hại uy tín thương hiệu và tốn chi phí bồi thường/chăm sóc khách hàng, nhưng tài xế vi phạm lại không chịu bất kỳ chế tài nào về mặt dòng tiền.
3. **Cứng nhắc, Admin không thể điều hành kinh doanh:**
   * Tỷ lệ 20% nằm chết trong mã nguồn Java. Khi Ban giám đốc muốn tung chương trình kích cầu giảm phí sàn cho tài xế vào mùa vắng khách, hoặc điều chỉnh phí theo biến động giá xăng... thì đội ngũ kỹ thuật buộc phải sửa code, build lại Docker image và deploy lại service.

---

## 💡 PHẦN 2: BÀI TOÁN NGHIỆP VỤ & GIẢI PHÁP (TO-BE)

### 2.1. Bản chất giải pháp: "Dùng đòn bẩy kinh tế để định hướng hành vi"
Thay vì cào bằng 20%, hệ thống sẽ chuyển sang cơ chế **Hoa hồng cá nhân hóa theo thời gian thực (Dynamic Personalized Commission)** dao động từ **12% đến 25%**:
* **Tài xế VIP/Xuất sắc:** Hoa hồng giảm dần về mức sàn **12%** (Giữ chân đối tác vàng).
* **Tài xế Tiêu chuẩn:** Hoa hồng ở mức cơ sở **18%**.
* **Tài xế Vi phạm/Kém:** Hoa hồng tăng dần lên mức trần **25%** (Răn đe, bù đắp rủi ro vận hành).

### 2.2. Cơ chế Thước đo hành vi: Điểm Uy Tín (Reputation Score)
Để biết tài xế nào xứng đáng được giảm phí, tài xế nào cần bị phạt, hệ thống đưa vào thước đo: **Điểm Uy Tín (Reputation Score)**:
* **Thang điểm:** Từ `0` đến `100` điểm.
* **Điểm khởi tạo:** Mọi tài xế mới được duyệt hồ sơ đều bắt đầu ở mức chuẩn: **80 điểm**.
* **Quy tắc biến động điểm:**
  * **Thưởng (+):**
    * Hoàn thành trọn vẹn 1 chuyến xe: **+1 điểm** (tối đa 100 điểm).
    * Được khách hàng chấm 5 sao: **+1 điểm** (tối đa 100 điểm).
  * **Phạt (-):**
    * Tự ý hủy cuốc sau khi đã nhận: Trừ từ **5 đến 20 điểm** (tùy thuộc hủy trước giờ xuất phát xa hay hủy cận giờ).

---

## 📐 PHẦN 3: CÔNG THỨC TOÁN HỌC & GIẢI THÍCH DỄ HIỂU

### 3.1. Ý tưởng công thức (Dân dã, dễ hình dung)
> **Hoa hồng thực tế = Hoa hồng cơ sở - [Thưởng/Phạt theo Sao] - [Thưởng/Phạt theo Uy tín]**

* **Khi tài xế làm TỐT hơn chuẩn:**
  * Rating cao hơn `4.5` sao $\rightarrow$ Được **giảm hoa hồng**.
  * Uy tín cao hơn `80` điểm $\rightarrow$ Được **giảm hoa hồng**.
* **Khi tài xế làm KÉM hơn chuẩn:**
  * Rating thấp hơn `4.5` sao $\rightarrow$ Bị **tăng hoa hồng (phạt)**.
  * Uy tín thấp hơn `80` điểm $\rightarrow$ Bị **tăng hoa hồng (phạt)**.
* **Cận biên an toàn (Giới hạn sàn/trần):**
  * Dù tài xế xuất sắc đến đâu, hoa hồng không bao giờ thấp hơn mức sàn **12%** (`R_min = 0.12`).
  * Dù tài xế vi phạm nhiều đến đâu, hoa hồng không bao giờ vượt quá mức trần **25%** (`R_max = 0.25`).

---

### 3.2. Công thức tính toán chi tiết

```text
1. Tính mức hoa hồng điều chỉnh (R_applied):
   R_applied = R_base - Delta_rating - Delta_reputation

2. Trong đó:
   - R_base: Tỷ lệ hoa hồng cơ sở do Admin cấu hình (Mặc định = 18% = 0.18)
   
   - Delta_rating: Hệ số thưởng/phạt theo đánh giá sao (Chuẩn 4.5 sao, bước nhảy 2%)
     Delta_rating = (driverRating - 4.5) * 0.02
     
   - Delta_reputation: Hệ số thưởng/phạt theo uy tín (Chuẩn 80 điểm, mỗi 10 điểm = 1%)
     Delta_reputation = ((reputationScore - 80) / 10) * 0.01

3. Kẹp giá trị vào khoảng an toàn 12% - 25% (Clamping):
   R_final = Math.max(R_min, Math.min(R_max, R_applied))
```

---

### 3.3. Ba ví dụ minh họa thực tế bằng số liệu trực quan

#### 🌟 Ví dụ 1: Bác tài Xuất sắc (VIP)
* **Thông số:** Rating = `5.0` sao, Điểm uy tín = `100` điểm, `R_base` = `18%`.
* **Tính toán:**
  * Thưởng Rating: `(5.0 - 4.5) * 0.02 = +0.5 * 0.02 = +0.01 (+1.0%)`
  * Thưởng Uy tín: `((100 - 80) / 10) * 0.01 = (20 / 10) * 0.01 = +0.02 (+2.0%)`
  * Tổng mức giảm: `1.0% + 2.0% = 3.0%`
  * **Hoa hồng áp dụng:** `18% - 3.0% = 15.0%` (Tài xế giữ lại 85% thu nhập).

#### 🚗 Ví dụ 2: Bác tài Tiêu chuẩn (Mới vào nghề)
* **Thông số:** Rating = `4.5` sao, Điểm uy tín = `80` điểm, `R_base` = `18%`.
* **Tính toán:**
  * Thưởng/Phạt Rating: `(4.5 - 4.5) * 0.02 = 0%`
  * Thưởng/Phạt Uy tín: `((80 - 80) / 10) * 0.01 = 0%`
  * **Hoa hồng áp dụng:** Đúng mức cơ sở `18.0%`.

#### ⚠️ Ví dụ 3: Bác tài Kém (Thường xuyên hủy chuyến)
* **Thông số:** Rating = `4.0` sao, Điểm uy tín = `60` điểm (bị trừ do hủy cuốc), `R_base` = `18%`.
* **Tính toán:**
  * Hệ số Rating: `(4.0 - 4.5) * 0.02 = -0.01 (-1.0%)` $\rightarrow$ Bị phạt tăng thêm `1.0%`.
  * Hệ số Uy tín: `((60 - 80) / 10) * 0.01 = -0.02 (-2.0%)` $\rightarrow$ Bị phạt tăng thêm `2.0%`.
  * **Hoa hồng áp dụng:** `18% + 1.0% + 2.0% = 21.0%` (Bị phạt thu thêm 3% phí sàn).

#### 🚨 Ví dụ 4: Bác tài Vi phạm nặng chạm trần
* **Thông số:** Rating = `3.0` sao, Điểm uy tín = `30` điểm, `R_base` = `18%`.
* **Tính toán:**
  * Phạt Rating: `(3.0 - 4.5) * 0.02 = -0.03 (-3.0%)`
  * Phạt Uy tín: `((30 - 80) / 10) * 0.01 = -0.05 (-5.0%)`
  * Tổng tính toán: `18% + 3.0% + 5.0% = 26.0%`
  * **Hoa hồng áp dụng sau Clamping:** Bị kẹp trần ở mức tối đa **25.0%**.

---

## 🗄️ PHẦN 4: THIẾT KẾ DỮ LIỆU TỐI GIẢN (CHẶT CHẼ, KHÔNG DƯ THỪA)

Thực hiện đúng yêu cầu: **"Chỉ đưa ra những gì ảnh hưởng đến công thức, tuyệt đối không thêm trường tùy tiện"**:

### 4.1. Bảng `driver_profile` — Thêm DUY NHẤT 1 cột
* **Căn cứ:** Biến số `reputationScore` tham gia trực tiếp vào công thức tính `Delta_reputation`. Hiện tại bảng `driver_profile` chưa có cột này.
* **Tận dụng tối đa cột có sẵn:**
  * Cột `driverRating` (Double) đã có sẵn $\rightarrow$ Phục vụ tính `Delta_rating`.
  * Cột `totalDriverRides` (Integer) đã có sẵn $\rightarrow$ Phục vụ theo dõi tổng chuyến đi.
  * *Loại bỏ hoàn toàn:* Không tạo thêm các cột như `total_completed_trips`, `total_cancelled_trips`.
```sql
ALTER TABLE driver_profile 
    ADD COLUMN reputation_score INT NOT NULL DEFAULT 80 COMMENT 'Điểm uy tín tài xế (0 - 100, mặc định 80)';
```

### 4.2. Bảng `users` — KHÔNG THAY ĐỔI GÌ (0 THÊM TRƯỜNG)
* **Cân nhắc kỹ lưỡng:** Hoa hồng chiết khấu nền tảng chỉ thu từ **Tài xế**, không thu từ Hành khách. Hành khách không tham gia vào công thức tính hoa hồng.
* **Quyết định:** Giữ nguyên bảng `users`, không thêm cột `customer_reputation_score` để tránh rác cơ sở dữ liệu.

### 4.3. Bảng Cấu hình Admin `commission_config` — ĐÚNG 3 THAM SỐ CÔNG THỨC
* **Căn cứ:** Admin chỉ cần quyền kiểm soát 3 con số ảnh hưởng trực tiếp đến dòng tiền: Mức cơ sở (`base_rate`), Sàn ưu đãi (`min_rate`), và Trần xử phạt (`max_rate`). Bảng chỉ có duy nhất 1 dòng cấu hình (`id = 'DEFAULT'`).
* **Không lưu gì thừa:** Các hằng số toán học (chuẩn 4.5 sao, chuẩn 80 điểm, bước nhảy 2% và 1%) được khai báo là hằng số Java (`private static final`) trong mã nguồn, không lưu vào DB để tránh Admin vô tình sửa làm sai lệch logic toán học.
```sql
CREATE TABLE IF NOT EXISTS commission_config (
    id VARCHAR(20) PRIMARY KEY DEFAULT 'DEFAULT',
    base_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1800 COMMENT 'Hoa hồng cơ sở (0.18 = 18%)',
    min_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1200 COMMENT 'Hoa hồng sàn tối thiểu (0.12 = 12%)',
    max_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.2500 COMMENT 'Hoa hồng trần tối đa (0.25 = 25%)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4.4. Loại bỏ hoàn toàn bảng log `reputation_logs`
* **Căn cứ:** Bảng log chỉ mang tính chất kiểm toán (audit), **hoàn toàn không tham gia vào công thức tính hoa hồng**.
* **Quyết định:** Không tạo bảng `reputation_logs`. Mọi biến động điểm được in ra **Application Log (SLF4J/Logback)**:
  `log.info("[Reputation] Driver {} score changed: {} -> {}", driverId, oldScore, newScore);`

---

## 🔌 PHẦN 5: ĐẶC TẢ API & LUỒNG TÍCH HỢP KAFKA

### 5.1. Luồng xử lý sự kiện Kafka trong `identity-service`
Cập nhật trực tiếp vào file [IdentityServiceConsumer.java](file:///c:/WorkSpace/RideUp/RideUpMicro/identity-service/src/main/java/com/example/demo/kafka/consumer/IdentityServiceConsumer.java):

```text
                       Sự kiện Kafka
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [booking-completed]              [driver-rating-updated]
            │                                 │
   1. Gọi CommissionService          1. Cập nhật driverRating
      tính R_final (12% - 25%)          (như hiện tại)
            │                                 │
   2. Tính tiền hoa hồng:             2. Nếu rating mới >= 5.0:
      commission = totalAmount * R_final ➜ Thưởng +1 điểm uy tín
            │                            (tối đa 100)
   3. driverProfile.systemDebt += commission  │
   4. totalDriverRides += 1                   ▼
   5. Thưởng +1 điểm uy tín (tối đa 100)  Ghi log (SLF4J)
            │
            ▼
     Ghi log (SLF4J)
```

### 5.2. Danh mục API cần triển khai

1. **API Nội bộ / Mobile App — Lấy tỷ lệ hoa hồng hiện tại của tài xế:**
   * `GET /drivers/{driverId}/commission-rate`
   * *Mục đích:* `payment-service` gọi Feign để chia tiền; Driver App gọi để hiển thị mức chiết khấu hiện tại của tài xế.
   * *Response:*
     ```json
     {
       "code": 1000,
       "result": {
         "driverId": "driver-123",
         "baseRate": 0.18,
         "driverRating": 4.9,
         "reputationScore": 95,
         "appliedCommissionRate": 0.157,
         "discountPercent": 2.3
       }
     }
     ```

2. **API Admin — Quản trị 3 tham số hoa hồng:**
   * `GET /admin/commission-config`: Xem 3 tham số hiện tại.
   * `PUT /admin/commission-config`: Cập nhật tham số (Ví dụ chỉnh `baseRate` từ 18% lên 20%).
     * Tự động xóa cache Redis `config:commission_rate` $\rightarrow$ Áp dụng ngay lập tức cho các cuốc kết thúc sau đó.
     * Ràng buộc logic: `0 < minRate <= baseRate <= maxRate < 1`.

3. **API Tài xế — Xem điểm uy tín cá nhân:**
   * `GET /drivers/me/reputation`: Trả về `reputationScore`, `driverRating`, `totalDriverRides`.

---

## 📋 PHẦN 6: KẾ HOẠCH TRIỂN KHAI 5 BƯỚC THỰC THI

| Bước | Tên công việc | Mô tả chi tiết | File can thiệp |
| :---: | :--- | :--- | :--- |
| **B1** | Bổ sung cột điểm uy tín | Thêm trường `Integer reputationScore = 80` vào Entity | [DriverProfile.java](file:///c:/WorkSpace/RideUp/RideUpMicro/identity-service/src/main/java/com/example/demo/entity/DriverProfile.java) |
| **B2** | Tạo Entity & Repository Cấu hình | Tạo `CommissionConfig` (chỉ đúng 3 trường: `baseRate`, `minRate`, `maxRate`) | `entity/CommissionConfig.java`<br>`repository/CommissionConfigRepository.java` |
| **B3** | Viết `CommissionService` | - Xây dựng hàm tính `R_final` theo công thức.<br>- Cache Redis `config:commission_rate`.<br>- Logic CRUD cấu hình cho Admin. | `service/CommissionService.java` |
| **B4** | Viết Controller & DTOs | - Controller Admin: `GET/PUT /admin/commission-config`.<br>- Controller Driver: `GET /drivers/{driverId}/commission-rate` và `GET /drivers/me/reputation`. | `controller/DriverController.java`<br>`dto/...` |
| **B5** | Tích hợp Kafka Consumer | Thay thế đoạn nhân cứng 20% trong [IdentityServiceConsumer.java](file:///c:/WorkSpace/RideUp/RideUpMicro/identity-service/src/main/java/com/example/demo/kafka/consumer/IdentityServiceConsumer.java) bằng `R_final`, cộng điểm uy tín khi hoàn thành chuyến và khi nhận review 5 sao. | [IdentityServiceConsumer.java](file:///c:/WorkSpace/RideUp/RideUpMicro/identity-service/src/main/java/com/example/demo/kafka/consumer/IdentityServiceConsumer.java) |

---

## 🧪 PHẦN 7: TIÊU CHUẨN NGHIỆM THU (TEST CRITERIA)

1. **Biên dịch:** `identity-service` chạy `mvn test-compile -DskipTests` thành công 100% (`BUILD SUCCESS`).
2. **Khởi tạo:** Tài xế mới được duyệt luôn có sẵn điểm uy tín là **80**.
3. **Cấu hình động:** Admin đổi `baseRate` từ 18% lên 20% qua API $\rightarrow$ Cuốc xe kết thúc tiếp theo tự động tính theo base 20% mà không cần khởi động lại server.
4. **Đúng công thức:**
   * Tài xế 5.0 sao, 100 điểm uy tín $\rightarrow$ Hoa hồng tự động giảm về **15.0%**.
   * Tài xế 3.0 sao, 30 điểm uy tín $\rightarrow$ Hoa hồng tự động phạt chạm trần **25.0%**.
5. **Cơ sở dữ liệu sạch:** Không thêm bất kỳ trường nào vào `users`, không tạo bảng log thừa, chỉ thêm đúng 1 cột `reputation_score` vào `driver_profile`.
