package com.rideUp.booking_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentCompletedRequest {

    @NotBlank(message = "Booking id is required")
    String bookingId;

    @NotBlank(message = "Payment id is required")
    String paymentId;

    String correlationId;
}
