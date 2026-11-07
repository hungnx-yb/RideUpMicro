package com.rideup.locationservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LocationDistanceConfigResponse {
    String id;
    String provinceId;
    String provinceName;
    Double maxDistanceKm;
    Double maxDistanceMeters;
    String description;
    Boolean isActive;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

