package com.rideup.trip_service.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UpdateTripRequest {
    String routeId;
    String driverId;
    String vehicleId;
    String startProvinceId;
    String endProvinceId;
    String startAddressText;
    String endAddressText;
    BigDecimal startLat;
    BigDecimal startLng;
    BigDecimal endLat;
    BigDecimal endLng;

    @Future(message = "Departure time must be in the future")
    LocalDateTime departureTime;
    LocalDateTime estimatedArrivalTime;

    @Positive(message = "Seat total must be > 0")
    Integer seatTotal;

    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be > 0")
    BigDecimal priceVnd;

    @Valid
    List<TripStopRequest> stops;
}
