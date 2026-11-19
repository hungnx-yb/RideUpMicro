package com.rideUp.booking_service.dto.event;

import com.rideUp.booking_service.enums.ModificationStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingModificationResolvedEvent {
    String eventId;
    String modificationId;
    String bookingId;
    String customerId;
    String tripId;
    String driverId;
    ModificationStatus status; // APPROVED, REJECTED, EXPIRED
    String reason;
    LocalDateTime resolvedAt;
    String correlationId;
}
