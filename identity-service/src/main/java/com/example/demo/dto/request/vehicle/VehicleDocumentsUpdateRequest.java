package com.example.demo.dto.request.vehicle;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleDocumentsUpdateRequest {
    MultipartFile registrationImage;
    LocalDate registrationExpiryDate;
    MultipartFile insuranceImage;
    LocalDate insuranceExpiryDate;
}
