package com.rideup.trip_service.dto.request;

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
public class UpdateFareBoundaryRequest {

    @NotNull(message = "minPricePerKm is required")
    @DecimalMin(value = "1", message = "Giá sàn phải lớn hơn 0")
    @DecimalMax(value = "100000", message = "Giá sàn không vượt quá 100.000đ/km")
    BigDecimal minPricePerKm;

    @NotNull(message = "maxPricePerKm is required")
    @DecimalMin(value = "1", message = "Giá trần phải lớn hơn 0")
    @DecimalMax(value = "100000", message = "Giá trần không vượt quá 100.000đ/km")
    BigDecimal maxPricePerKm;

    @DecimalMin(value = "1.0", message = "Hệ số đường bộ tối thiểu 1.0")
    @DecimalMax(value = "2.0", message = "Hệ số đường bộ tối đa 2.0")
    BigDecimal roadFactor;

    Boolean enabled;
}
