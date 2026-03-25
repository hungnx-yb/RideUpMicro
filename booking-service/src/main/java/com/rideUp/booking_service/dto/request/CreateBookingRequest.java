package com.rideUp.booking_service.dto.request;

import com.rideUp.booking_service.enums.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class CreateBookingRequest {

    @NotBlank(message = "Trip id is required")
    String tripId;

    @NotNull(message = "Seat count is required")
    @Positive(message = "Seat count must be greater than zero")
    Integer seatCount;

    @NotNull(message = "Payment method is required")
    PaymentMethod paymentMethod;

    @NotNull(message = "Pickup latitude is required")
    Double pickupLat;

    @NotNull(message = "Pickup longitude is required")
    Double pickupLng;

    @NotBlank(message = "Pickup address is required")
    String pickupAddressText;

    @NotNull(message = "Dropoff latitude is required")
    Double dropoffLat;

    @NotNull(message = "Dropoff longitude is required")
    Double dropoffLng;

    @NotBlank(message = "Dropoff address is required")
    String dropoffAddressText;

    String note;
}
