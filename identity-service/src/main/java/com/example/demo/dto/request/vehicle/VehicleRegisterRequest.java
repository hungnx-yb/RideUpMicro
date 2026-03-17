package com.example.demo.dto.request.vehicle;

import com.example.demo.enums.VehicleType;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleRegisterRequest {
    String plateNumber;
    
    String vehicleBrand;
    
    String vehicleModel;
    
    @Min(value = 1990, message = "Vehicle year must be after 1990")
    @Max(value = 2030, message = "Vehicle year must be before 2030")
    Integer vehicleYear;
    
    String vehicleColor;
    
    @Min(value = 2, message = "Seat capacity must be at least 2")
    @Max(value = 50, message = "Seat capacity must not exceed 50")
    Integer seatCapacity;
    
    VehicleType vehicleType;
    
    MultipartFile vehicleImage;
    
    MultipartFile registrationImage;
    
    LocalDate registrationExpiryDate;
    
    MultipartFile insuranceImage;
    
    LocalDate insuranceExpiryDate;
}
