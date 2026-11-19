package com.example.demo.dto.response.driver;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommissionConfigResponse implements Serializable {
    BigDecimal baseRate;
    BigDecimal minRate;
    BigDecimal maxRate;
}
