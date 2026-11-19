package com.rideup.locationservice.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LocationDistanceConfigRequest {

    /**
     * Mã Tỉnh/TP. Để trống (null hoặc rỗng) nếu là Cấu hình Toàn cục (Global Default)
     */
    String provinceId;

    @NotNull(message = "Bán kính tối đa không được để trống")
    @DecimalMin(value = "1.0", message = "Bán kính tối thiểu là 1.0 km")
    @DecimalMax(value = "100.0", message = "Bán kính tối đa là 100.0 km")
    Double maxDistanceKm;

    String description;

    @Builder.Default
    Boolean isActive = true;
}

