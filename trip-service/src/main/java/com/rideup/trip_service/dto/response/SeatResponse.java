package com.rideup.trip_service.dto.response;

import com.rideup.trip_service.enums.TripStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeatResponse {
    String tripId;
    Integer seatAvailable;
    Integer seatTotal;
    BigDecimal priceVnd;
    TripStatus status;
}
