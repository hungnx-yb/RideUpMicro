package com.example.demo.dto.event;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
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
    String driverId; 
    String tripId;
    java.math.BigDecimal totalAmount;
    LocalDateTime completedAt;
}
