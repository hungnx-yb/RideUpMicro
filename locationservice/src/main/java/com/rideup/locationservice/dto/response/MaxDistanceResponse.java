package com.rideup.locationservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MaxDistanceResponse {
    String provinceId;
    String provinceName;
    Double maxDistanceKm;
    Double maxDistanceMeters;
    Boolean isOverride;
    String description;
}

