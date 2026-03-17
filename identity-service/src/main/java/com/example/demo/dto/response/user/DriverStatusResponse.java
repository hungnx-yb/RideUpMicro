package com.example.demo.dto.response.user;

import com.example.demo.enums.DriverStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverStatusResponse {
    DriverStatus status;
    LocalDateTime approvedAt;
    String approvedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    String message;
}
