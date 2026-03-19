package com.rideup.trip_service.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateTripRequest {

    @NotBlank(message = "Route is required")
    String routeId;

    @NotBlank(message = "Start province is required")
    String startProvinceId;

    @NotBlank(message = "End province is required")
    String endProvinceId;

    String startAddressText;

    String endAddressText;

    @NotNull(message = "Departure time is required")
    @Future(message = "Departure time must be in the future")
    LocalDateTime departureTime;

    LocalDateTime estimatedArrivalTime;

    @NotNull(message = "Seat total is required")
    @Positive(message = "Seat total must be > 0")
    Integer seatTotal;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be > 0")
    BigDecimal priceVnd;

    String note ;
    @Valid
    List<TripStopRequest> stops;
}
