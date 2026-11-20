package com.rideup.trip_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FareBoundaryResponse implements Serializable {
    BigDecimal minPricePerKm;
    BigDecimal maxPricePerKm;
    BigDecimal roadFactor;
    Boolean enabled;
    String updatedBy;
    /** ISO-8601 (chuỗi để cache Redis an toàn) */
    String updatedAt;
}
