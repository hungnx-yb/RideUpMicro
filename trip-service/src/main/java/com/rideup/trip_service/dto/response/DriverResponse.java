package com.rideup.trip_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverResponse {

    String userId;
    String fullName;
    String email;
    String phoneNumber;
    String avatarUrl;

    //    Vehicle infor
    String vehicleImage;
    String vehicleBrand;
    String vehicleModel;
    String vehicleId;

}
