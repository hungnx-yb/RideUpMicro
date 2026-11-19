package com.rideup.notification_service.dto.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonIgnoreProperties(ignoreUnknown = true)
public class BookingModificationRequestedEvent {
    String eventId;
    String modificationId;
    String bookingId;
    String customerId;
    String tripId;
    String driverId;
    String newPickupAddress;
    String newDropoffAddress;
    LocalDateTime expiresAt;
}
