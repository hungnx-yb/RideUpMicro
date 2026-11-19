package com.rideUp.booking_service.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
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
    String correlationId;
}
