package com.rideup.trip_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

/**
 * Trạng thái đủ điều kiện nhận chuyến của tài xế theo cấu hình động (ADM-FEAT-01/02).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverEligibilityResponse {
    String driverId;
    BigDecimal systemDebt;
    BigDecimal creditLimit;
    Integer reputationScore;
    Integer minAcceptScore;
    /** Nợ >= hạn mức => bị khóa nhận chuyến tiền mặt */
    Boolean debtBlocked;
    /** Điểm uy tín < ngưỡng tối thiểu => bị khóa nhận chuyến */
    Boolean reputationBlocked;
    Boolean canAcceptTrips;
}
