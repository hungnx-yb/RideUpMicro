package com.example.demo.dto.response.driver;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverFaceStatusResponse {
    Boolean isFaceEnrolled;
    LocalDateTime lastFaceVerifiedAt;
    Boolean isValidToday;
    String status; // VALID, NEEDS_VERIFY, NOT_ENROLLED
    String message;
}
