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
    BigDecimal effectiveRate;
    BigDecimal discount;
}
