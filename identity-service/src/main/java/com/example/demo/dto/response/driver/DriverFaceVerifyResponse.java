package com.example.demo.dto.response.driver;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverFaceVerifyResponse {
    Boolean isVerified;
    Boolean isReal;
    Double similarity;
    Double livenessScore;
    String message;
    LocalDateTime verifiedAt;
}
