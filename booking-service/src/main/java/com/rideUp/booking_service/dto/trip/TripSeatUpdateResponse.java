package com.rideUp.booking_service.dto.trip;

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
public class TripSeatUpdateResponse {

    String tripId;
    Integer seatAvailable;
    Integer seatTotal;
    Integer version;
    String status;
}
