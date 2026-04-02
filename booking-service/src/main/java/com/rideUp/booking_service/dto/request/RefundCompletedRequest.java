package com.rideUp.booking_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RefundCompletedRequest {

    @NotBlank(message = "Booking id is required")
    String bookingId;

    @NotBlank(message = "Refund id is required")
    String refundId;

    String correlationId;

}
