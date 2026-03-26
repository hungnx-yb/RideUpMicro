package com.rideUp.booking_service.dto.response;

import com.rideUp.booking_service.enums.BookingStatus;
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
    BookingStatus status;
    String paymentId;

    Integer seatCount;
    BigDecimal pricePerSeat;
    BigDecimal totalAmount;

    Double pickupLat;
    Double pickupLng;
    String pickupWardId;
    String pickupAddressText;

    Double dropoffLat;
    Double dropoffLng;
    String dropoffWardId;
    String dropoffAddressText;

    String note;
    LocalDateTime reservedAt;
    LocalDateTime expiresAt;
    LocalDateTime cancelledAt;
    String cancelReason;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
