package com.example.demo.dto.request.user;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
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
    String cccd;
    

    MultipartFile cccdImageFront;
    
    MultipartFile cccdImageBack;
    
    String gplx;
    
    LocalDate gplxExpiryDate;
    
    MultipartFile gplxImage;
}
