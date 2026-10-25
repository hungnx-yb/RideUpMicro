package com.example.demo.dto.request.driver;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverFaceCompareRequest {
    @NotBlank(message = "Image 1 base64 is required")
    String image1Base64;

    @NotBlank(message = "Image 2 base64 is required")
    String image2Base64;

    @Builder.Default
    Double threshold = 0.65;
}
