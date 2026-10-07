package com.example.demo.dto.request.driver;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverFaceEnrollRequest {
    @NotBlank(message = "Image base64 cannot be empty")
    String imageBase64;
}
