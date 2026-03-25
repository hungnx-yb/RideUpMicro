package com.rideUp.booking_service.dto.event;

import com.rideUp.booking_service.enums.PaymentMethod;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentRequestedEvent {

    String eventId;
    String bookingId;
    String customerId;
    String tripId;
    Integer seatCount;
    PaymentMethod paymentMethod;
    LocalDateTime createdAt;
}
