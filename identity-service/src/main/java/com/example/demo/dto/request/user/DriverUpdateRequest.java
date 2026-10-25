package com.example.demo.dto.request.user;

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
public class DriverUpdateRequest {
    String cccd;
    MultipartFile cccdImageFront;
    MultipartFile cccdImageBack;
    String gplx;
    LocalDate gplxIssueDate;
    LocalDate gplxExpiryDate;
    String gplxIssuePlace;
    MultipartFile gplxImageFront;
    MultipartFile gplxImageBack;
    List<String> gplxClasses;
}
