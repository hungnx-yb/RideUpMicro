package com.example.demo.dto.response.driver;

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
    BigDecimal baseRate;
    Double driverRating;
    Integer reputationScore;
    BigDecimal appliedCommissionRate;
    BigDecimal discountPercent;
}
