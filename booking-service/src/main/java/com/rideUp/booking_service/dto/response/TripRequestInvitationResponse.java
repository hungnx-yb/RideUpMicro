package com.rideUp.booking_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripRequestInvitationResponse {
    String id;
    String tripRequestId;
    String driverId;
    String tripId;
    String message;
    String status;
    LocalDateTime respondedAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
