package com.rideup.trip_service.dto.response;

import com.rideup.trip_service.enums.TripRequestStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripRequestResponse {
    String id;
    String passengerId;
    UserResponse passenger; // Aggregated from identity-service via Feign

    String startProvinceId;
    String startWardId;
    String endProvinceId;
    String endWardId;
    String startAddressText;
    String endAddressText;

    LocalDateTime departureTime;
    Integer seatTotal;
    TripRequestStatus status;
    String note;

    LocalDateTime expiresAt;
    LocalDateTime cancelledAt;
    String cancelReason;
    Integer pendingInvitationCount;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
