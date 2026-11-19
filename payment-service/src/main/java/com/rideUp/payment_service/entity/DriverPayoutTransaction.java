package com.rideUp.payment_service.entity;

import com.rideUp.payment_service.enums.PayoutStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "driver_payout_transaction")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverPayoutTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(nullable = false, unique = true, length = 64)
    String bookingId;

    @Column(nullable = false, length = 64)
    String driverId;

    @Column(length = 64)
    String stripeAccountId;

    @Column(length = 64)
    String stripeTransferId;

    @Column(nullable = false, precision = 12, scale = 2)
    BigDecimal totalFare;

    @Column(nullable = false, precision = 5, scale = 4)
    BigDecimal commissionRate;

    @Column(nullable = false, precision = 12, scale = 2)
    BigDecimal commissionAmount;

    @Column(nullable = false, precision = 12, scale = 2)
    BigDecimal netDriverIncome;

    @Column(nullable = false, precision = 12, scale = 2)
    BigDecimal debtBefore;

    @Column(nullable = false, precision = 12, scale = 2)
    BigDecimal debtDeducted;

    @Column(nullable = false, precision = 12, scale = 2)
    BigDecimal debtAfter;

    @Column(nullable = false, precision = 12, scale = 2)
    BigDecimal finalPayoutAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    PayoutStatus status;

    @Column(columnDefinition = "TEXT")
    String failureReason;

    @CreationTimestamp
    LocalDateTime createdAt;

    @UpdateTimestamp
    LocalDateTime updatedAt;
}
