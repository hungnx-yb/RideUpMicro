package com.example.demo.dto.response.admin;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DebtTransactionResponse {
    String id;
    String bookingId;
    String type;
    String paymentMethod;
    BigDecimal grossAmount;
    BigDecimal commissionRate;
    BigDecimal commissionAmount;
    BigDecimal debtChange;
    BigDecimal debtBefore;
    BigDecimal debtAfter;
    String note;
    LocalDateTime createdAt;
}
