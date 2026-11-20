package com.example.demo.dto.request.driver;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
    @DecimalMax(value = "0.50", message = "Base rate must not exceed 0.50 (50%)")
    BigDecimal baseRate;

    @NotNull(message = "Min rate is required")
    @DecimalMin(value = "0.01", message = "Min rate must be at least 0.01 (1%)")
    @DecimalMax(value = "0.50", message = "Min rate must not exceed 0.50 (50%)")
    BigDecimal minRate;

    @NotNull(message = "Max rate is required")
    @DecimalMin(value = "0.01", message = "Max rate must be at least 0.01 (1%)")
    @DecimalMax(value = "0.50", message = "Max rate must not exceed 0.50 (50%)")
    BigDecimal maxRate;

    // Các tham số bên dưới là tùy chọn: null => giữ nguyên giá trị hiện tại
    @DecimalMin(value = "1.0", message = "Rating benchmark must be between 1 and 5")
    @DecimalMax(value = "5.0", message = "Rating benchmark must be between 1 and 5")
    Double ratingBenchmark;

    @DecimalMin(value = "0.0", message = "Rating step must be >= 0")
    @DecimalMax(value = "0.10", message = "Rating step must not exceed 0.10 (10%/sao)")
    BigDecimal ratingStep;

    @Min(value = 0, message = "Reputation benchmark must be between 0 and 100")
    @Max(value = 100, message = "Reputation benchmark must be between 0 and 100")
    Integer reputationBenchmark;

    @DecimalMin(value = "0.0", message = "Reputation step must be >= 0")
    @DecimalMax(value = "0.10", message = "Reputation step must not exceed 0.10 (10%/10 điểm)")
    BigDecimal reputationStep;

    @DecimalMin(value = "0", message = "Credit limit must be >= 0")
    @DecimalMax(value = "100000000", message = "Credit limit must not exceed 100.000.000 VND")
    BigDecimal creditLimit;

    @Min(value = 0, message = "Min accept score must be between 0 and 100")
    @Max(value = 100, message = "Min accept score must be between 0 and 100")
    Integer minAcceptScore;
}
