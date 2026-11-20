package com.example.demo.entity;

import com.example.demo.enums.DebtTransactionType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ADM-FEAT-02: Sổ cái biến động công nợ hoa hồng của tài xế.
 *
 * Đặt tại identity-service vì đây là nơi duy nhất thay đổi DriverProfile.systemDebt
 * (payment-service chỉ gọi API nội bộ add-debt / deduct-debt).
 */
@Entity
@Table(name = "debt_transactions", indexes = {
        @Index(name = "idx_debt_tx_driver", columnList = "driver_user_id"),
        @Index(name = "idx_debt_tx_created_at", columnList = "created_at"),
        @Index(name = "idx_debt_tx_type", columnList = "type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DebtTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "driver_profile_id", length = 64, nullable = false)
    String driverProfileId;

    @Column(name = "driver_user_id", length = 64)
    String driverUserId;

    @Column(name = "booking_id", length = 64)
    String bookingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 32, nullable = false)
    DebtTransactionType type;

    /** CASH | STRIPE | null */
    @Column(name = "payment_method", length = 16)
    String paymentMethod;

    /** Giá trị vé (GMV) của cuốc xe phát sinh hoa hồng */
    @Column(name = "gross_amount", precision = 15, scale = 2)
    BigDecimal grossAmount;

    @Column(name = "commission_rate", precision = 5, scale = 4)
    BigDecimal commissionRate;

    /** Tiền hoa hồng sàn thu được từ cuốc xe */
    @Column(name = "commission_amount", precision = 15, scale = 2)
    BigDecimal commissionAmount;

    /** Biến động công nợ (dương = tăng nợ, âm = giảm nợ, 0 = không đổi) */
    @Column(name = "debt_change", precision = 15, scale = 2, nullable = false)
    BigDecimal debtChange;

    @Column(name = "debt_before", precision = 15, scale = 2, nullable = false)
    BigDecimal debtBefore;

    @Column(name = "debt_after", precision = 15, scale = 2, nullable = false)
    BigDecimal debtAfter;

    @Column(name = "note", length = 255)
    String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;
}
