package com.example.demo.dto.response.vehicle;

import com.example.demo.enums.VehicleReviewStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleStatusResponse {
    VehicleReviewStatus status;
    Boolean hasVehicle;
    Boolean canAcceptTrips;
    String message;
    String rejectionReason;
}
