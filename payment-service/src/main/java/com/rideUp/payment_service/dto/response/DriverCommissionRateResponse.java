package com.rideUp.payment_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverCommissionRateResponse {
    String driverId;
    Integer reputationScore;
    BigDecimal baseRate;
    Double driverRating;

    // Khớp tên field với identity-service DriverCommissionRateResponse
    BigDecimal appliedCommissionRate;
    BigDecimal discountPercent;

    // Alias getter để code cũ dùng getEffectiveRate() vẫn hoạt động
    public BigDecimal getEffectiveRate() {
        return appliedCommissionRate;
    }

    // Alias getter để code cũ dùng getDiscount() vẫn hoạt động
    public BigDecimal getDiscount() {
        return discountPercent;
    }
}
