package com.example.demo.dto.response.vehicle;

import com.example.demo.enums.VehicleType;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleResponse {
    String id;
    String driverId;
    String plateNumber;
    String vehicleBrand;
    String vehicleModel;
    Integer vehicleYear;
    String vehicleColor;
    Integer seatCapacity;
    VehicleType vehicleType;
    String vehicleImage;
    String registrationImage;
    LocalDate registrationExpiryDate;
    String insuranceImage;
    LocalDate insuranceExpiryDate;
    Boolean isVerified;
    Boolean isActive;
    LocalDateTime approvedAt;
    String approvedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    
    // Driver info
    String driverName;
    String driverPhone;
    String driverEmail;
    Double driverRating;
}
