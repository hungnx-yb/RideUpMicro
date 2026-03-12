package com.example.demo.dto.request;

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
    @NotBlank(message = "Plate number is required")
    String plateNumber;
    
    @NotBlank(message = "Vehicle brand is required")
    String vehicleBrand;
    
    @NotBlank(message = "Vehicle model is required")
    String vehicleModel;
    
    @NotNull(message = "Vehicle year is required")
    @Min(value = 1990, message = "Vehicle year must be after 1990")
    @Max(value = 2030, message = "Vehicle year must be before 2030")
    Integer vehicleYear;
    
    @NotBlank(message = "Vehicle color is required")
    String vehicleColor;
    
    @NotNull(message = "Seat capacity is required")
    @Min(value = 2, message = "Seat capacity must be at least 2")
    @Max(value = 50, message = "Seat capacity must not exceed 50")
    Integer seatCapacity;
    
    @NotNull(message = "Vehicle type is required")
    VehicleType vehicleType;
    
    @NotBlank(message = "Vehicle image is required")
    MultipartFile vehicleImage;
    
    @NotBlank(message = "Registration image is required")
    MultipartFile registrationImage;
    
    @NotNull(message = "Registration expiry date is required")
    LocalDate registrationExpiryDate;
    
    @NotBlank(message = "Insurance image is required")
    MultipartFile insuranceImage;
    
    @NotNull(message = "Insurance expiry date is required")
    LocalDate insuranceExpiryDate;
}
