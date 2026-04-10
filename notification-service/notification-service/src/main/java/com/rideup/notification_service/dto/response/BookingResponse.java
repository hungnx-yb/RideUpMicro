package com.rideup.notification_service.dto.response;

import com.rideup.notification_service.enums.NotificationStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingResponse {
    String id;
    String bookingCode;
    String customerId;
    String tripId;
    String paymentId;
    NotificationStatus paymentStatus;
    Integer seatCount;
    BigDecimal pricePerSeat;
    BigDecimal totalAmount;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
