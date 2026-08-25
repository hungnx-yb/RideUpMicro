package com.rideup.notification_service.dto.event;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingWaitingApprovalEvent {
    String eventId;
    String correlationId;
    String bookingId;
    String customerId;
    String tripId;
    Integer seatCount;
    String paymentMethod;
    BigDecimal totalAmount;
    LocalDateTime createdAt;
}
