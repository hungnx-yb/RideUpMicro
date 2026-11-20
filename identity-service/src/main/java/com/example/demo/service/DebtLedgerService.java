package com.example.demo.service;

import com.example.demo.entity.DebtTransaction;
import com.example.demo.entity.DriverProfile;
import com.example.demo.enums.DebtTransactionType;
import com.example.demo.repository.DebtTransactionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.EnumSet;

/**
 * ADM-FEAT-02: Ghi sổ cái mọi biến động công nợ của tài xế.
 * Gọi trong cùng transaction với thao tác cập nhật DriverProfile.systemDebt.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DebtLedgerService {

    DebtTransactionRepository debtTransactionRepository;

    /** Cuốc xe này đã được ghi nhận hoa hồng chưa (chống cộng nợ trùng khi Kafka retry) */
    public boolean isCommissionRecorded(String bookingId) {
        if (bookingId == null || bookingId.isBlank()) {
            return false;
        }
        return debtTransactionRepository.existsByBookingIdAndTypeIn(bookingId,
                EnumSet.of(DebtTransactionType.CASH_COMMISSION, DebtTransactionType.STRIPE_COMMISSION));
    }

    public void recordCommission(DriverProfile profile, String bookingId, String paymentMethod,
                                 BigDecimal grossAmount, BigDecimal rate, BigDecimal commission,
                                 BigDecimal debtBefore, BigDecimal debtAfter) {
        boolean isCash = paymentMethod == null || "CASH".equalsIgnoreCase(paymentMethod);
        save(DebtTransaction.builder()
                .driverProfileId(profile.getId())
                .driverUserId(resolveUserId(profile))
                .bookingId(bookingId)
                .type(isCash ? DebtTransactionType.CASH_COMMISSION : DebtTransactionType.STRIPE_COMMISSION)
                .paymentMethod(isCash ? "CASH" : "STRIPE")
                .grossAmount(grossAmount)
                .commissionRate(rate)
                .commissionAmount(commission)
                .debtChange(debtAfter.subtract(debtBefore))
                .debtBefore(debtBefore)
                .debtAfter(debtAfter)
                .note(isCash ? "Hoa hồng cuốc tiền mặt cộng vào công nợ" : "Hoa hồng cuốc Stripe trích tại nguồn")
                .build());
    }

    public void recordDebtChange(DriverProfile profile, DebtTransactionType type,
                                 BigDecimal debtBefore, BigDecimal debtAfter, String note) {
        save(DebtTransaction.builder()
                .driverProfileId(profile.getId())
                .driverUserId(resolveUserId(profile))
                .type(type)
                .paymentMethod(type == DebtTransactionType.STRIPE_OFFSET ? "STRIPE" : null)
                .debtChange(debtAfter.subtract(debtBefore))
                .debtBefore(debtBefore)
                .debtAfter(debtAfter)
                .note(note)
                .build());
    }

    private void save(DebtTransaction transaction) {
        debtTransactionRepository.save(transaction);
        log.info("[DebtLedger] {} driver={} change={} ({} -> {})", transaction.getType(),
                transaction.getDriverUserId(), transaction.getDebtChange(),
                transaction.getDebtBefore(), transaction.getDebtAfter());
    }

    private String resolveUserId(DriverProfile profile) {
        return profile.getUser() != null ? profile.getUser().getId() : profile.getId();
    }
}
