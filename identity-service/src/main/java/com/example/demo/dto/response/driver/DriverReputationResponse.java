package com.example.demo.dto.response.driver;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverReputationResponse {
    Integer reputationScore;
    Integer totalDriverRides;
    Double driverRating;

    // Hoa hồng cá nhân hóa - để frontend hiển thị chính xác
    BigDecimal effectiveRate;
    BigDecimal discount;
    BigDecimal baseRate;
}
