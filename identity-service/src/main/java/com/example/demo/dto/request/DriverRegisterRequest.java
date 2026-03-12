package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverRegisterRequest {
    @NotBlank(message = "CCCD is required")
    String cccd;
    
    @NotBlank(message = "CCCD front image is required")
    MultipartFile cccdImageFront;
    
    @NotBlank(message = "CCCD back image is required")
    MultipartFile cccdImageBack;
    
    @NotBlank(message = "GPLX is required")
    String gplx;
    
    @NotNull(message = "GPLX expiry date is required")
    LocalDate gplxExpiryDate;
    
    @NotBlank(message = "GPLX image is required")
    MultipartFile gplxImage;
}
