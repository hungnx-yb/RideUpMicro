package com.rideUp.booking_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * ADM-FEAT-02: Bộ chỉ số KPI tài chính cho Dashboard Doanh thu & Công nợ.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueKpiResponse {
    LocalDate fromDate;
    LocalDate toDate;
    String paymentMethod;

    // ---- Từ booking-service ----
    /** Tổng giá trị vé các chuyến hoàn thành */
    BigDecimal totalGmv;
    BigDecimal cashGmv;
    BigDecimal stripeGmv;
    long completedBookings;
    long cancelledBookings;
    BigDecimal averageTicketValue;
    List<DailyRevenuePoint> dailySeries;

    // ---- Từ identity-service (sổ cái hoa hồng & công nợ) ----
    /** false nếu không lấy được dữ liệu từ identity-service */
    boolean financeAvailable;
    BigDecimal commissionRevenue;
    BigDecimal cashCommission;
    BigDecimal stripeCommission;
    BigDecimal outstandingDebt;
    BigDecimal stripeOffsetRecovered;
    BigDecimal manualDebtPaid;
    long driversWithDebt;
    long driversOverLimit;
    BigDecimal creditLimit;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class DailyRevenuePoint {
        LocalDate date;
        BigDecimal gmv;
        BigDecimal cashGmv;
        BigDecimal stripeGmv;
        long bookings;
    }
}
