package com.example.demo.dto.request.user;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverUpdateRequest {
    String cccd;
    MultipartFile cccdImageFront;
    MultipartFile cccdImageBack;
    String gplx;
    LocalDate gplxExpiryDate;
    MultipartFile gplxImage;
}
