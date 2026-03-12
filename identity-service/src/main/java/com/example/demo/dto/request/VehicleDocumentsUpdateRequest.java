package com.example.demo.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VehicleDocumentsUpdateRequest {
    String registrationImage;
    LocalDate registrationExpiryDate;
    String insuranceImage;
    LocalDate insuranceExpiryDate;
}
