package com.example.demo.dto.response.user;

import com.example.demo.enums.DriverStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverResponse {
    String id;
    String cccd;
    String cccdImageFront;
    String cccdImageBack;
    String gplx;
    LocalDate gplxExpiryDate;
    String gplxImage;
    Double driverRating;
    Integer totalDriverRides;
    DriverStatus status;
    LocalDateTime approvedAt;
    String approvedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    
    // User info
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


    public DriverResponse(
            String userId,
            String fullName,
            String email,
            String phoneNumber,
            String avatarUrl,
            String vehicleId,
            String vehicleImage,
            String vehicleBrand,
            String vehicleModel
    ) {
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.avatarUrl = avatarUrl;
        this.vehicleId = vehicleId;
        this.vehicleImage = vehicleImage;
        this.vehicleBrand = vehicleBrand;
        this.vehicleModel = vehicleModel;
    }

}
