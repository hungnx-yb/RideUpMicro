package com.rideup.trip_service.dto.response;

import com.rideup.trip_service.enums.InvitationStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripRequestInvitationResponse {
    String id;
    String tripRequestId;
    String tripId;
    String driverId;
    DriverResponse driver; // Aggregated from identity-service via Feign
    String message;
    InvitationStatus status;
    String passengerId;
    Integer seatCount;
    LocalDateTime respondedAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    String driverName;
    String driverAvatar;
    String driverPhone;
    Double driverRating;
    String vehicleInfo;
    String plateNumber;
    String vehicleColor;
    Integer totalRides;
    BigDecimal price;

    LocalDateTime departureTime;
    LocalDateTime estimatedArrivalTime;
    String startProvinceId;
    String endProvinceId;
    String startAddressText;
    String endAddressText;
    Integer seatAvailable;
    Integer seatTotal;
    BigDecimal pricePerSeat;
    List<TripStopResponse> stops;
}
