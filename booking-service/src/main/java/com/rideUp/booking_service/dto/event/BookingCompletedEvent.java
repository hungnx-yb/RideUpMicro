package com.rideUp.booking_service.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingCompletedEvent {
    String eventId;
    String correlationId;
    String bookingId;
    String customerId;
    String driverId; // You might need this for the review UI
    String tripId;
    LocalDateTime completedAt;
}
