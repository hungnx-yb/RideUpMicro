package com.rideUp.booking_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotNull(message = "Pickup latitude is required")
    Double pickupLat;

    @NotNull(message = "Pickup longitude is required")
    Double pickupLng;

    @NotBlank(message = "Pickup ward id is required")
    String pickupWardId;

    @NotBlank(message = "Dropoff address is required")
    String dropoffAddressText;

    @NotNull(message = "Dropoff latitude is required")
    Double dropoffLat;

    @NotNull(message = "Dropoff longitude is required")
    Double dropoffLng;

    @NotBlank(message = "Dropoff ward id is required")
    String dropoffWardId;

    String passengerName;
    String passengerPhone;
    String note;
}
