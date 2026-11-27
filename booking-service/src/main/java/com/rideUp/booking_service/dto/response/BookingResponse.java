package com.rideUp.booking_service.dto.response;

import com.rideUp.booking_service.enums.BookingStatus;
import com.rideUp.booking_service.enums.PaymentMethod;
import com.rideUp.booking_service.enums.PaymentStatus;
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
    PaymentMethod paymentMethod;
    PaymentStatus paymentStatus;

    Integer seatCount;
    BigDecimal totalAmount;

    String pickupWardId;
    String pickupAddressText;

    String dropoffWardId;
    String dropoffAddressText;

    String passengerName;
    String passengerPhone;

    String userAvatar;
    String userName;

    String note;
    LocalDateTime expiresAt;
    LocalDateTime cancelledAt;
    String cancelReason;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
