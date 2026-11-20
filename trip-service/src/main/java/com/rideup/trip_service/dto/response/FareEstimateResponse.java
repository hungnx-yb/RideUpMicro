package com.rideup.trip_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * Khoảng giá vé hợp lệ (1 ghế) cho một tuyến tỉnh -> tỉnh.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FareEstimateResponse {
    String startProvinceId;
    String endProvinceId;
    /** Quãng đường ước tính (km). null nếu không xác định được tọa độ tỉnh */
    BigDecimal distanceKm;
    BigDecimal minPrice;
    BigDecimal maxPrice;
    BigDecimal minPricePerKm;
    BigDecimal maxPricePerKm;
    /** false nếu tắt kiểm tra hoặc không tính được quãng đường (cùng tỉnh / thiếu tọa độ) */
    boolean applicable;
}
