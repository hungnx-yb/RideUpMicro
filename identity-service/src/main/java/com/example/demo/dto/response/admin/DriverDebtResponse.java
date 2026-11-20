package com.example.demo.dto.response.admin;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

/**
 * Một dòng trong Sổ công nợ tài xế (Driver Debt Ledger).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverDebtResponse {
    String driverProfileId;
    String userId;
    String fullName;
    String email;
    String phoneNumber;
    String plateNumber;
    List<String> operatingProvinceIds;
    BigDecimal systemDebt;
    BigDecimal creditLimit;
    Integer reputationScore;
    Double driverRating;
    /** NORMAL | WARNING (>= 80% hạn mức) | BLOCKED (>= hạn mức) */
    String debtStatus;
}
