package com.rideUp.booking_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * ADM-FEAT-02: Tổng hợp tài chính phía identity-service (hoa hồng & công nợ).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FinanceSummaryResponse {
    /** Hoa hồng sàn thực thu trong kỳ (theo bộ lọc phương thức thanh toán) */
    BigDecimal commissionRevenue;
    BigDecimal cashCommission;
    BigDecimal stripeCommission;
    /** Tổng công nợ đang treo hiện tại của toàn bộ tài xế (không phụ thuộc kỳ lọc) */
    BigDecimal outstandingDebt;
    /** Nợ đã thu hồi qua cơ chế cấn trừ tiền Stripe trong kỳ */
    BigDecimal stripeOffsetRecovered;
    /** Nợ tài xế tự nộp trong kỳ */
    BigDecimal manualDebtPaid;
    long driversWithDebt;
    long driversOverLimit;
    BigDecimal creditLimit;
}
