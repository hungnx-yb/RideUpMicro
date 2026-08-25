package com.rideUp.booking_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripResponse {
    String id;
    String driverId;
    String vehicleId;
    String status;
}
