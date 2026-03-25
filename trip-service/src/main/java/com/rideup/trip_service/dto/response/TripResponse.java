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
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripResponse {
    String id;
    String routeId;
    String driverId;
    String vehicleId;
    String startProvinceId;
    String endProvinceId;
    String startAddressText;
    String endAddressText;
    LocalDateTime departureTime;
    LocalDateTime estimatedArrivalTime;
    Integer seatTotal;
    Integer seatAvailable;
    BigDecimal priceVnd;
    TripStatus status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    List<TripStopResponse> stops;


    String driverName;
    String driverEmail;
    String driverPhone;
    String avatarUrl;
    Double driverRating;

    String vehicleImage;
    String vehicleBrand;
    String vehicleModel;
}
