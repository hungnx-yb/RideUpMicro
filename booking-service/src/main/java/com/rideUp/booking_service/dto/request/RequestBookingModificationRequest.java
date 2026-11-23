package com.rideUp.booking_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RequestBookingModificationRequest {

    @NotBlank(message = "Pickup address is required")
    String pickupAddressText;

    @NotBlank(message = "Pickup ward id is required")
    String pickupWardId;

    @NotBlank(message = "Dropoff address is required")
    String dropoffAddressText;

    @NotBlank(message = "Dropoff ward id is required")
    String dropoffWardId;

    String passengerName;
    String passengerPhone;
    String note;
}
