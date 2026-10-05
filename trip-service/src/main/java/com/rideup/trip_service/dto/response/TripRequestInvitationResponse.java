package com.rideup.trip_service.dto.response;

import com.rideup.trip_service.enums.InvitationStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripRequestInvitationResponse {
    String id;
    String tripRequestId;
    String tripId;
    String driverId;
    DriverResponse driver; // Aggregated from identity-service via Feign
    String message;
    InvitationStatus status;
    LocalDateTime respondedAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
