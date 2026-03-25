package com.rideUp.payment_service.dto.response;

import com.rideUp.payment_service.enums.PaymentMethod;
import com.rideUp.payment_service.enums.PaymentStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentResponse {

    String id;
    String bookingId;
    BigDecimal amount;
    PaymentMethod method;
    PaymentStatus status;
    String transactionId;
    String paymentUrl;
    String failureReason;
    LocalDateTime paidAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
