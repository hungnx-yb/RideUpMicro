package com.rideup.trip_service.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripRequestCreateDTO {
    @NotBlank(message = "Start province ID is required")
    String startProvinceId;

    String startWardId;

    @NotBlank(message = "End province ID is required")
    String endProvinceId;

    String endWardId;

    @NotBlank(message = "Start address is required")
    String startAddressText;

    @NotBlank(message = "End address is required")
    String endAddressText;

    @NotNull(message = "Departure time is required")
    @Future(message = "Departure time must be in the future")
    LocalDateTime departureTime;

    @NotNull(message = "Seat total is required")
    @Min(value = 1, message = "At least 1 seat is required")
    Integer seatTotal;

    String note;
}
