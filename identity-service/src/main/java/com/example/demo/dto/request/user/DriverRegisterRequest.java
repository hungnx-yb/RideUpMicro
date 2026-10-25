package com.example.demo.dto.request.user;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverRegisterRequest {
    String cccd;
    

    MultipartFile cccdImageFront;
    
    MultipartFile cccdImageBack;
    
    MultipartFile portraitImage;
    
    String gplx;
    LocalDate gplxIssueDate;
    LocalDate gplxExpiryDate;
    String gplxIssuePlace;
    
    MultipartFile gplxImageFront;
    MultipartFile gplxImageBack;

    List<String> gplxClasses;

    // Vehicle information
    String plateNumber;
    String vehicleBrand;
    String vehicleModel;
    String vehicleColor;
    Integer vehicleYear;
    Integer seatCapacity;
    com.example.demo.enums.VehicleType vehicleType;
    MultipartFile vehicleImage;
    MultipartFile registrationImage;
    MultipartFile registrationImageFront;
    MultipartFile registrationImageBack;
    MultipartFile insuranceImage;
}
