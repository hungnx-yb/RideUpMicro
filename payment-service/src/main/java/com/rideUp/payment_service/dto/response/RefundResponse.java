package com.rideUp.payment_service.dto.response;

import com.rideUp.payment_service.enums.RefundStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RefundResponse {

    String id;

    BigDecimal amount;

    RefundStatus status;

    String requestId;

    String responseCode;

    String failureReason;

    LocalDateTime refundedAt;

    LocalDateTime createdAt;

    LocalDateTime updatedAt;
}