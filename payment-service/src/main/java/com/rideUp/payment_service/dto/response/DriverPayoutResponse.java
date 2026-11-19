package com.rideUp.payment_service.dto.response;

import com.rideUp.payment_service.enums.PayoutStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverPayoutResponse {
    String id;
    String bookingId;
    String driverId;
    String stripeAccountId;
    String stripeTransferId;
    BigDecimal totalFare;
    BigDecimal commissionRate;
    BigDecimal commissionAmount;
    BigDecimal netDriverIncome;
    BigDecimal debtBefore;
    BigDecimal debtDeducted;
    BigDecimal debtAfter;
    BigDecimal finalPayoutAmount;
    PayoutStatus status;
    String failureReason;
    LocalDateTime createdAt;
}
