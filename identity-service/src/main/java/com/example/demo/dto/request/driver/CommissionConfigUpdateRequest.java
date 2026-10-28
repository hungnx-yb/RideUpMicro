package com.example.demo.dto.request.driver;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommissionConfigUpdateRequest {

    @NotNull(message = "Base rate is required")
    @DecimalMin(value = "0.01", message = "Base rate must be at least 0.01 (1%)")
    @DecimalMax(value = "1.00", message = "Base rate must not exceed 1.00 (100%)")
    BigDecimal baseRate;

    @NotNull(message = "Min rate is required")
    @DecimalMin(value = "0.01", message = "Min rate must be at least 0.01 (1%)")
    @DecimalMax(value = "1.00", message = "Min rate must not exceed 1.00 (100%)")
    BigDecimal minRate;

    @NotNull(message = "Max rate is required")
    @DecimalMin(value = "0.01", message = "Max rate must be at least 0.01 (1%)")
    @DecimalMax(value = "1.00", message = "Max rate must not exceed 1.00 (100%)")
    BigDecimal maxRate;
}
