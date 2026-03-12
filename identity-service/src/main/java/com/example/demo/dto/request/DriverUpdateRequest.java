package com.example.demo.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverUpdateRequest {
    String cccd;
    String cccdImageFront;
    String cccdImageBack;
    String gplx;
    LocalDate gplxExpiryDate;
    String gplxImage;
}
