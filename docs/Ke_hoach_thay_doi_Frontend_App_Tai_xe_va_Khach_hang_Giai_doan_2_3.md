# 🎨 THIẾT KẾ VÀ TỐI ƯU GIAO DIỆN CLEAN UI/UX
## BỘ CHUẨN DESIGN SYSTEM & PHÁT TRIỂN GIAO DIỆN GIAI ĐOẠN 2 & 3
### (APP TÀI XẾ, APP KHÁCH HÀNG & ADMIN DASHBOARD)

> **Tài liệu đặc tả kiến trúc giao diện người dùng (UI/UX Specification)**  
> **Áp dụng cho:** `rideup-driver-app` (React Native), `rideup-customer-app` (React Native), `rideUpMicroUi` (React Vite Web)  
> **Tác giả:** Senior Backend & Solution Architect (SA)  
> **Trạng thái:** Bản thiết kế tối ưu hóa sạch (Clean & Modern Fintech UI)  

---

## 📌 I. RÀ SOÁT HIỆN TRẠNG GIAO DIỆN (CODEBASE AUDIT)

Qua quá trình rà soát trực tiếp các tập tin giao diện hiện hữu trong codebase:
* [rideup-driver-app/src/screens/WalletScreen.js](file:///c:/WorkSpace/RideUp/RideUpMicro/rideup-driver-app/src/screens/WalletScreen.js)
* [rideup-driver-app/src/screens/DriverDashboardScreen.js](file:///c:/WorkSpace/RideUp/RideUpMicro/rideup-driver-app/src/screens/DriverDashboardScreen.js)
* [rideup-customer-app/src/screens/SearchRideScreen.js](file:///c:/WorkSpace/RideUp/RideUpMicro/rideup-customer-app/src/screens/SearchRideScreen.js)
* [rideup-customer-app/src/screens/RatingScreen.js](file:///c:/WorkSpace/RideUp/RideUpMicro/rideup-customer-app/src/screens/RatingScreen.js)
* [rideUpMicroUi/src/pages/AdminDashboardPage.jsx](file:///c:/WorkSpace/RideUp/RideUpMicro/rideUpMicroUi/src/pages/AdminDashboardPage.jsx)

### 1. Bảng đánh giá hiện trạng & Điểm nghẽn cần tối ưu

| Màn hình | Hiện trạng trong Code | Hạn chế / Điểm nghẽn | Đề xuất tối ưu Clean UI |
| :--- | :--- | :--- | :--- |
| **Ví tài xế (`WalletScreen.js`)** | 1 thẻ trắng đơn điệu giữa màn hình, dòng nợ đỏ/xanh, 1 nút bấm trả nợ thô, văn bản tĩnh ghi cứng 20% hoa hồng. | • Không hiển thị Điểm uy tín (0-100).<br>• Không có cổng Stripe Connect (chưa liên kết / đã liên kết).<br>• Không có nút mở Stripe Express Portal rút tiền.<br>• Không có sổ cái sao kê từng cuốc xe (bù trừ nợ). | **Tái cấu trúc thành 4 Card Fintech cao cấp:**<br>1. Card Dư nợ & Thước đo 500k.<br>2. Card Điểm uy tín & % Hoa hồng động.<br>3. Card Cổng nhận tiền Stripe Express.<br>4. List Sổ cái giải ngân & Bù trừ nợ minh bạch. |
| **Dashboard tài xế (`DriverDashboardScreen.js`)** | Có thẻ doanh thu, vé boarding pass sắp khởi hành, lưới tính năng nhanh. | Chưa có thông báo nhắc nhở tài xế nếu chưa kết nối Stripe (khiến tài xế mất cơ hội nhận cuốc khách trả thẻ). | Thêm **Smart Alert Banner** nhắc nhở kết nối Stripe hoặc cảnh báo khi dư nợ tiền mặt vượt 400.000 đ. |
| **Đặt vé khách (`SearchRideScreen.js`)** | 2 nút hình chữ nhật đơn giản `[Tiền mặt]` và `[Stripe (Thẻ)]`. Bấm tự do dù tài xế chưa liên kết Stripe. | • Không kiểm tra xem tài xế đã bật nhận thẻ chưa (dễ gây lỗi 400).<br>• Không có nhận diện logo thẻ quốc tế/nội địa.<br>• Không có bảo chứng an toàn tạm giữ tiền. | Nâng cấp thành **Payment Method Radio Cards:**<br>• Card thẻ có logo Visa/Master/Napas + Huy hiệu sàn tạm giữ tiền an toàn.<br>• Card thẻ tự động **disabled mờ** nếu tài xế chưa liên kết Stripe (dựa vào API `payment-options`). |
| **Đánh giá chuyến (`RatingScreen.js`)** | 5 ngôi sao to bấm chọn và ô bình luận, thông báo cảm ơn đơn giản. | Chưa truyền tải được tác động tích cực của đánh giá 5 sao đối với uy tín của tài xế. | Thêm **Micro-copy khích lệ:** *"5 sao của bạn sẽ thưởng +1 điểm uy tín cho tài xế và giúp họ giảm phí sàn!"*. |
| **Admin Web (`AdminDashboardPage.jsx`)** | Quản lý duyệt tài xế, duyệt xe, thống kê chung. | Chưa có giao diện để Admin điều chỉnh 3 tỷ lệ hoa hồng (12% - 25%) và xem bảng đối soát bù trừ nợ. | Bổ sung **Tab Cấu hình Hoa hồng Động** (có preview tính toán) và **Bảng Sổ cái Giải ngân Stripe**. |

---

## 🎨 II. BỘ QUY TẮC THIẾT KẾ CHUẨN (CLEAN DESIGN SYSTEM)

Để giao diện đồng bộ, cao cấp và chuẩn chỉnh như các ứng dụng công nghệ hàng đầu (Grab, Uber, Stripe), chúng ta chuẩn hóa bộ Design Tokens dùng chung cho toàn bộ dự án:

### 1. Bảng màu chủ đạo (Color Palette)

```text
• Nền ứng dụng (Background):       #F8FAFC (Slate-50, sạch sẽ, thoáng mắt)
• Bề mặt thẻ (Surface/Card):       #FFFFFF (Trắng tinh khiết bo góc 16px)
• Màu chủ đạo (Primary Accent):    #0EA5E9 (Sky-500, sắc xanh công nghệ RideUp)
• Màu nhận diện Stripe (Brand):    #6366F1 (Indigo-500 tím Stripe hiện đại)
• Màu thành công (Success):        #10B981 (Emerald-500, đã liên kết, sạch nợ)
• Màu cảnh báo nợ (Warning):       #F59E0B (Amber-500, nợ 400k-500k, uy tín trung bình)
• Màu nguy hiểm (Danger/Error):    #EF4444 (Rose-500, nợ quá 500k bị khóa chuyến)
• Văn bản chính (Text Primary):    #0F172A (Slate-900, độ tương phản cao, dễ đọc)
• Văn bản phụ (Text Muted):        #64748B (Slate-500, thông tin bổ trợ)
• Viền ngăn cách (Border):         #E2E8F0 (Slate-200, viền mỏng 1px tinh tế)
```

### 2. Nguyên tắc bố cục & Trải nghiệm (Clean UI Principles)
1. **Phân cấp thị giác rõ ràng (Visual Hierarchy):** Số tiền to nhất (`28px - 32px`), trạng thái dùng Chip/Badge bo tròn `pill`, mô tả phụ dùng cỡ chữ nhỏ gọn `13px`.
2. **Khoảng cách thoáng đãng (Breathing Room):** Padding trong thẻ `16px - 20px`, khoảng cách giữa các thẻ `12px - 16px`.
3. **Phản hồi trạng thái tức thì (Instant Feedback):** Nút bấm có hiệu ứng `activeOpacity: 0.8`, có biểu tượng xoay `ActivityIndicator` khi đang gọi Stripe API.
4. **Không để người dùng bối rối (Defensive UX):** Tùy chọn nào không khả dụng (ví dụ chuyến xe không nhận Stripe) phải được giải thích lý do lịch sự ngay trên UI.

---

## 🚗 III. THIẾT KẾ TỐI ƯU CHO DRIVER APP (ỨNG DỤNG TÀI XẾ)

### 1. Tối ưu toàn diện màn hình "Ví & Quản lý Thu nhập" (`WalletScreen.js`)

Thay vì 1 ô card đơn điệu, màn hình mới được tổ chức thành cấu trúc 4 khối thẻ rõ ràng:

#### 📐 Bản vẽ Chi tiết Giao diện Mới (High-Fidelity Wireframe):

```text
┌─────────────────────────────────────────────────────────────┐
│ [←]                    VÍ & TÀI CHÍNH                       │
├─────────────────────────────────────────────────────────────┤
│ 1️⃣ THẺ TỔNG QUAN CÔNG NỢ & HẠN MỨC 500K                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tổng dư nợ tiền mặt cần thanh toán:                     │ │
│ │ 45.000 đ                                                │ │
│ │ [🟢 Tài khoản an toàn] (Hạn mức: 500.000 đ)             │ │
│ │                                                         │ │
│ │ Thanh hạn mức nợ: [██░░░░░░░░░░░░░░░░░░░░] 45k / 500k    │ │
│ │ 💡 Khách trả thẻ sẽ tự động cấn trừ sạch khoản nợ này.   │ │
│ │ [ 💳 Nạp tiền trả nợ ngay qua thẻ ]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 2️⃣ THẺ HẠNG UY TÍN & HOA HỒNG CÁ NHÂN HÓA (GIAI ĐOẠN 2)     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🛡️ Điểm uy tín tài xế: 85 / 100 [Hạng Vàng]            │ │
│ │ Tiến trình: [████████████████░░░░] (85%)                │ │
│ │                                                         │ │
│ │ Tỷ lệ hoa hồng áp dụng: 15.0%                           │ │
│ │ 🏷️ Bạn đang được GIẢM 3.0% hoa hồng nhờ lái xe an toàn! │ │
│ │ (Tỷ lệ hoa hồng sàn gốc: 18.0%)                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 3️⃣ THẺ CỔNG NHẬN TIỀN STRIPE CONNECT EXPRESS (GIAI ĐOẠN 3) │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ TRƯỜNG HỢP A: ĐÃ KÍCH HOẠT (ACTIVE)                     │ │
│ │ 🟢 Cổng thanh toán trực tuyến: ĐÃ KÍCH HOẠT             │ │
│ │ Mã tài khoản liên kết: acct_1P9xyz823...                │ │
│ │ Tiền cuốc thẻ sẽ được tự động giải ngân về tài khoản này│ │
│ │ [ ⚙️ Quản lý thẻ ATM / Xem sao kê Stripe Portal ➔ ]     │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ TRƯỜNG HỢP B: CHƯA LIÊN KẾT (NOT_CONNECTED)             │ │
│ │ ⚠️ Bạn chưa liên kết tài khoản nhận tiền trực tuyến!    │ │
│ │ Khách hàng sẽ không thể thanh toán thẻ trên chuyến của bạn│
│ │ [ 🔗 Bắt đầu liên kết tài khoản Stripe Express ]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 4️⃣ SỔ CÁI LỊCH SỬ NHẬN TIỀN & ĐỐI SOÁT BÙ TRỪ NỢ           │
│ Bộ lọc: [ Tất cả (3) ]   [ Đã chuyển tiền ]   [ Trừ hết nợ ]│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Vé #BK-038291 • Hà Nội ➔ Hải Phòng      14:30 - Hôm nay │ │
│ │ Hình thức: 💳 Thẻ trực tuyến (Stripe)                   │ │
│ │ • Tiền vé gốc khách trả:                     + 200.000 đ │ │
│ │ • Hoa hồng sàn (Ưu đãi 15%):                 -  30.000 đ │ │
│ │ • Cấn trừ nợ tiền mặt cuốc trước:            -  45.000 đ │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ 💰 Thực nhận vào tài khoản Stripe:           + 125.000 đ │ │
│ │ Mã giao dịch: tr_1P9821049x    [🟢 ĐÃ CHUYỂN TIỀN]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Vé #BK-038290 • Hải Phòng ➔ Hà Nội      11:15 - Hôm nay │ │
│ │ Hình thức: 💵 Tiền mặt (Khách đưa trực tiếp tài xế)      │ │
│ │ • Tiền vé khách đưa:                           300.000 đ │ │
│ │ • Hoa hồng sàn ghi nợ (15%):                 -  45.000 đ │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ ⚠️ Ghi nhận vào công nợ sàn:                 +  45.000 đ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 💻 Cấu trúc Code React Native sạch (Clean Component Blueprint):

```jsx
// Mẫu Component cấu trúc sạch cho WalletScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { apiService } from '../services/apiService';

const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0EA5E9',
  stripeBrand: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
};

export default function WalletScreenClean({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    loadAllFinancialData();
  }, []);

  const loadAllFinancialData = async () => {
    try {
      setLoading(true);
      const [repRes, stripeRes, payoutRes] = await Promise.all([
        apiService.getDriverReputation().catch(() => null),
        apiService.getStripeAccountStatus().catch(() => null),
        apiService.getDriverPayouts().catch(() => null),
      ]);
      if (repRes?.data?.result) setReputation(repRes.data.result);
      if (stripeRes?.data?.result) setStripeStatus(stripeRes.data.result);
      if (payoutRes?.data?.result) setPayouts(payoutRes.data.result);
    } catch (e) {
      console.log('Lỗi tải dữ liệu tài chính:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setConnectingStripe(true);
      const res = await apiService.createStripeOnboardLink();
      const onboardUrl = res.data?.result?.onboardUrl;
      if (onboardUrl) {
        // Mở In-App Browser đưa tài xế sang cổng Stripe Onboard
        await WebBrowser.openBrowserAsync(onboardUrl);
        // Khi quay trở lại, tự động refresh dữ liệu
        loadAllFinancialData();
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể khởi tạo liên kết Stripe Connect.');
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    try {
      const res = await apiService.createStripeDashboardLink();
      const dashboardUrl = res.data?.result?.dashboardUrl;
      if (dashboardUrl) {
        await WebBrowser.openBrowserAsync(dashboardUrl);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể mở cổng quản trị Stripe Express.');
    }
  };

  // Render các Card...
}
```

---

### 2. Tối ưu Dashboard Tài xế (`DriverDashboardScreen.js`)

Bổ sung **Smart Alert Banner** ngay dưới thanh chào đón để tài xế nắm bắt ngay trạng thái tài chính mà không cần bấm vào tab Ví:

```text
┌─────────────────────────────────────────────────────────────┐
│ 🔔 BANNER NHẮC NHỞ TÀI CHÍNH THÔNG MINH                     │
│                                                             │
│ [TRƯỜNG HỢP 1: CHƯA BẬT STRIPE]                             │
│ ⚠️ Bạn chưa liên kết tài khoản Stripe Express.              │
│    Khách hàng sẽ không thể thanh toán thẻ trên xe của bạn. │
│    [ 🔗 Liên kết ngay trong 1 phút ]                        │
│                                                             │
│ [TRƯỜNG HỢP 2: DƯ NỢ TIỀN MẶT CAO]                          │
│ 🛑 Cảnh báo: Dư nợ của bạn là 420.000 đ (Gần chạm mức 500k).│
│    Vui lòng nạp tiền hoặc nhận cuốc thanh toán thẻ để cấn   │
│    trừ, tránh bị tạm khóa chuyến xe mới.                   │
│    [ 💳 Nạp nợ ngay ]                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🙋‍♂️ IV. THIẾT KẾ TỐI ƯU CHO PASSENGER APP (ỨNG DỤNG KHÁCH HÀNG)

### 1. Tối ưu Modal Đặt vé trong `SearchRideScreen.js`

#### Hiện trạng:
Hai nút bấm `[Tiền mặt]` và `[Stripe (Thẻ)]` đặt cạnh nhau, không kiểm tra điều kiện tài xế.

#### Thiết kế Clean UI Mới (Radio Card Selection):

```text
┌─────────────────────────────────────────────────────────────┐
│ 💳 PHƯƠNG THỨC THANH TOÁN                                   │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ (•) 💳 Thẻ thanh toán trực tuyến (Stripe)               │ │
│ │     Chấp nhận: [Visa] [Mastercard] [JCB] [Napas]        │ │
│ │     ─────────────────────────────────────────────────── │ │
│ │     🔒 Bảo chứng RideUp: Tiền được sàn tạm giữ an toàn  │ │
│ │        và chỉ chuyển cho tài xế sau khi bạn xuống xe.   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ( ) 💵 Tiền mặt trực tiếp                               │ │
│ │     Trả tiền trực tiếp cho tài xế khi xuống xe.         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [TRƯỜNG HỢP TÀI XẾ CHƯA KÍCH HOẠT STRIPE]:                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ (•) 💵 Tiền mặt trực tiếp (Mặc định)                    │ │
│ │     Trả tiền trực tiếp cho tài xế khi xuống xe.         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [x] 🔒 Thẻ trực tuyến (Stripe)                          │ │
│ │     ⚠️ Tài xế chuyến này chưa kích hoạt cổng thanh toán  │ │
│ │        thẻ. Vui lòng chọn thanh toán bằng tiền mặt.     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 🔌 Tích hợp Logic:
Khi khách bấm chọn 1 chuyến xe, Modal trước khi mở sẽ gọi:
```javascript
const res = await apiService.getTripPaymentOptions(selectedTrip.id);
const { stripeEnabled } = res.data.result;

if (!stripeEnabled) {
  setPaymentMethod('CASH'); // Mặc định chuyển sang tiền mặt
  setIsStripeAllowed(false); // Vô hiệu hóa Radio Card của Stripe
} else {
  setIsStripeAllowed(true);
}
```

---

### 2. Tối ưu màn hình Đánh giá Chuyến đi (`RatingScreen.js`)

Khi khách chấm **5 sao**, giao diện hiển thị hiệu ứng huy hiệu vàng kèm dòng cảm ơn truyền cảm hứng:

```text
┌─────────────────────────────────────────────────────────────┐
│                      ĐÁNH GIÁ CHUYẾN ĐI                     │
│                                                             │
│                 [Avatar Tài Xế Nguyễn Văn A]                │
│                     Chuyến đi thế nào?                      │
│                                                             │
│                    ⭐   ⭐   ⭐   ⭐   ⭐                    │
│                                                             │
│     ┌─────────────────────────────────────────────────┐     │
│     │ ✨ TUYỆT VỜI!                                   │     │
│     │ Đánh giá 5 sao của bạn sẽ cộng +1 điểm uy tín   │     │
│     │ cho tài xế Nguyễn Văn A, giúp tài xế được sàn   │     │
│     │ giảm phí hoa hồng ở các chuyến tiếp theo!       │     │
│     └─────────────────────────────────────────────────┘     │
│                                                             │
│     [ Ô nhập cảm nghĩ của bạn về tài xế...          ]       │
│                                                             │
│     [                GỬI ĐÁNH GIÁ                   ]       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🖥️ V. THIẾT KẾ TỐI ƯU CHO ADMIN DASHBOARD (`rideUpMicroUi`)

Dành cho Web Quản trị React Vite + Tailwind CSS:

### 1. Tab Cấu hình Hoa hồng Sàn (`/admin/commission-config`)
* **Giao diện:**
  * 3 ô nhập số phần trăm kèm Slider trực quan:
    * **Tỷ lệ hoa hồng gốc:** `18.0 %` (Áp dụng khi uy tín = 80).
    * **Tỷ lệ tối thiểu (Sàn ưu đãi):** `12.0 %` (Áp dụng khi uy tín = 100).
    * **Tỷ lệ tối đa (Phạt vi phạm):** `25.0 %` (Áp dụng khi uy tín <= 50).
  * **Preview Calculator:** Cho Admin kéo thanh điểm uy tín từ 0 đến 100 để xem trước công thức tính toán ra bao nhiêu % hoa hồng theo thời gian thực.
  * Nút `[💾 Lưu & Cập nhật Redis Cache Tức Thì]`.

---

### 2. Tab Sổ cái Giải ngân & Bù trừ Nợ (`/admin/financial/driver-payouts`)
* **Bảng dữ liệu sạch (Tailwind DataTable):**
  * **Cột 1:** Mã vé (`#BK-038291`)
  * **Cột 2:** Tài xế (`Nguyễn Văn A - 0912345678`)
  * **Cột 3:** Tiền vé (`200.000 đ`)
  * **Cột 4:** Tỷ lệ & Tiền hoa hồng (`15% ➜ 30.000 đ`)
  * **Cột 5:** Nợ cũ & Số nợ đã cấn trừ (`45.000 đ ➜ Trừ 45.000 đ`)
  * **Cột 6:** Số tiền thực chuyển Stripe (`125.000 đ`)
  * **Cột 7:** Mã Stripe Transfer (`tr_1P9821049x`)
  * **Cột 8:** Trạng thái (`COMPLETED` xanh lá / `FULL_DEBT_OFFSET` xanh dương).
  * **Công cụ:** Ô tìm kiếm theo mã vé / tài xế, bộ lọc ngày tháng và nút xuất báo cáo Excel/CSV.

---

## 📌 VI. KẾT LUẬN & LỘ TRÌNH TRIỂN KHAI FRONTEND

1. **Giai đoạn chuẩn bị (Setup):** Đội ngũ Frontend bổ sung các endpoint mới vào `apiService.js` của cả 2 app (đã có đầy đủ đặc tả request/response).
2. **Triển khai Driver App:** Ưu tiên làm mới `WalletScreen.js` theo cấu trúc 4 Card để phục vụ nghiệm thu Stripe Connect và xem bù trừ nợ.
3. **Triển khai Customer App:** Cập nhật Modal chọn phương thức thanh toán trong `SearchRideScreen.js` có kiểm tra `payment-options`.
4. **Triển khai Web Admin:** Tích hợp form cấu hình hoa hồng và bảng đối soát sổ cái.
