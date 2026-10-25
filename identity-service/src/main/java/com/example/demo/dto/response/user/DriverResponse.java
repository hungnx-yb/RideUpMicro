package com.example.demo.dto.response.user;

import com.example.demo.enums.DriverStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
    String portraitImage;
    String gplx;
    LocalDate gplxIssueDate;
    LocalDate gplxExpiryDate;
    String gplxIssuePlace;
    String gplxImageFront;
    String gplxImageBack;
    List<String> gplxClasses;
    Double driverRating;
    Integer totalDriverRides;
    DriverStatus status;
    LocalDateTime approvedAt;
    String approvedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    List<String> operatingProvinceIds;
    Boolean isFaceEnrolled;
    LocalDateTime lastFaceVerifiedAt;
    Double faceMatchScore;
    
    // User info
    String userId;
    String fullName;
    String email;
    String phoneNumber;
    String avatarUrl;

//    Vehicle info
    String vehicleId;
    String plateNumber;
    String vehicleBrand;
    String vehicleModel;
    String vehicleColor;
    Integer vehicleYear;
    Integer seatCapacity;
    String vehicleType;
    String vehicleImage;
    String registrationImage;
    String insuranceImage;

    public DriverResponse(
            String userId,
            String fullName,
            String email,
            String phoneNumber,
            String avatarUrl,
            Double driverRating,
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
        this.driverRating = driverRating;
        this.vehicleId = vehicleId;
        this.vehicleImage = vehicleImage;
        this.vehicleBrand = vehicleBrand;
        this.vehicleModel = vehicleModel;
    }

    public DriverResponse(
            String userId,
            String fullName,
            String email,
            String phoneNumber,
            String avatarUrl,
            Double driverRating,
            String vehicleId,
            String vehicleImage,
            String vehicleBrand,
            String vehicleModel,
            Integer seatCapacity
    ) {
        this.userId = userId;
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.avatarUrl = avatarUrl;
        this.driverRating = driverRating;
        this.vehicleId = vehicleId;
        this.vehicleImage = vehicleImage;
        this.vehicleBrand = vehicleBrand;
        this.vehicleModel = vehicleModel;
        this.seatCapacity = seatCapacity;
    }

}
