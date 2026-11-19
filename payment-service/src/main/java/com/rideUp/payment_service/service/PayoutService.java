package com.rideUp.payment_service.service;

import com.rideUp.payment_service.dto.event.BookingCompletedEvent;
import com.rideUp.payment_service.dto.response.ApiResponse;
import com.rideUp.payment_service.dto.response.DriverCommissionRateResponse;
import com.rideUp.payment_service.dto.response.DriverFinancialProfileResponse;
import com.rideUp.payment_service.dto.response.DriverPayoutResponse;
import com.rideUp.payment_service.entity.DriverPayoutTransaction;
import com.rideUp.payment_service.entity.Payment;
import com.rideUp.payment_service.enums.PaymentMethod;
import com.rideUp.payment_service.enums.PaymentStatus;
import com.rideUp.payment_service.enums.PayoutStatus;
import com.rideUp.payment_service.enums.StripeAccountStatus;
import com.rideUp.payment_service.exception.AppException;
import com.rideUp.payment_service.exception.ErrorCode;
import com.rideUp.payment_service.feignClient.IdentityServiceClient;
import com.rideUp.payment_service.kafka.producer.PaymentServicePublisher;
import com.rideUp.payment_service.repository.DriverPayoutTransactionRepository;
import com.rideUp.payment_service.repository.PaymentRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Transfer;
import com.stripe.param.TransferCreateParams;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PayoutService {

    DriverPayoutTransactionRepository driverPayoutTransactionRepository;
    PaymentRepository paymentRepository;
    IdentityServiceClient identityServiceClient;
    PaymentServicePublisher paymentServicePublisher;

    @Transactional
    public DriverPayoutTransaction processStripeBookingCompleted(BookingCompletedEvent event, Payment payment) {
        String bookingId = event.getBookingId();
        String driverId = event.getDriverId();
        log.info("[PayoutService] Starting Stripe Connect payout & debt offset for bookingId={}, driverId={}", bookingId, driverId);

        // 1. Idempotency Check
        Optional<DriverPayoutTransaction> existingTx = driverPayoutTransactionRepository.findByBookingId(bookingId);
        if (existingTx.isPresent()) {
            DriverPayoutTransaction tx = existingTx.get();
            if (tx.getStatus() == PayoutStatus.COMPLETED || tx.getStatus() == PayoutStatus.FULL_DEBT_OFFSET) {
                log.info("[PayoutService] Booking {} payout was already processed with status {}. Idempotent return.",
                        bookingId, tx.getStatus());
                return tx;
            }
        }

        // 2. Capture PaymentIntent if holding or pending
        if (payment != null && payment.getMethod() == PaymentMethod.STRIPE
                && (payment.getStatus() == PaymentStatus.HOLDING || payment.getStatus() == PaymentStatus.PENDING)) {
            try {
                if (payment.getTransactionId() != null && !payment.getTransactionId().isBlank()) {
                    PaymentIntent paymentIntent = PaymentIntent.retrieve(payment.getTransactionId());
                    if ("requires_capture".equals(paymentIntent.getStatus())) {
                        paymentIntent.capture();
                        log.info("[PayoutService] Successfully captured PaymentIntent {} for booking {}", payment.getTransactionId(), bookingId);
                    }
                }
                payment.setStatus(PaymentStatus.PAID);
                payment.setPaidAt(LocalDateTime.now());
                paymentRepository.save(payment);
                paymentServicePublisher.publishPaymentCompleted(payment);
            } catch (StripeException e) {
                log.error("[PayoutService] Failed to capture Stripe PaymentIntent for booking {}: {}", bookingId, e.getMessage(), e);
                payment.setStatus(PaymentStatus.FAILED);
                payment.setFailureReason("Capture failed: " + e.getMessage());
                paymentRepository.save(payment);
                paymentServicePublisher.publishPaymentFailed(payment, e.getMessage());
                throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
            }
        }

        // 3. Query Driver Financial Profile & Commission Rate
        BigDecimal totalFare = payment != null ? payment.getAmount() : event.getTotalAmount();
        if (totalFare == null || totalFare.compareTo(BigDecimal.ZERO) <= 0) {
            log.error("[PayoutService] Invalid total fare for booking {}", bookingId);
            throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT);
        }

        DriverFinancialProfileResponse financialProfile = fetchDriverFinancialProfile(driverId);
        BigDecimal appliedRate = fetchDriverCommissionRate(driverId);

        BigDecimal commissionAmount = totalFare.multiply(appliedRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal netDriverIncome = totalFare.subtract(commissionAmount);
        BigDecimal debtBefore = financialProfile != null && financialProfile.getSystemDebt() != null
                ? financialProfile.getSystemDebt()
                : BigDecimal.ZERO;

        log.info("[PayoutService] Financial summary: totalFare={}, rate={}, commission={}, netIncome={}, debtBefore={}",
                totalFare, appliedRate, commissionAmount, netDriverIncome, debtBefore);

        // 4. Validate Driver Stripe Account Connection
        String stripeAccountId = financialProfile != null ? financialProfile.getStripeAccountId() : null;
        boolean isPayoutsEnabled = financialProfile != null && Boolean.TRUE.equals(financialProfile.getStripePayoutsEnabled());
        boolean isActive = financialProfile != null && financialProfile.getStripeAccountStatus() == StripeAccountStatus.ACTIVE;

        if (stripeAccountId == null || !isActive || !isPayoutsEnabled) {
            log.warn("[PayoutService] Driver {} has not connected active Stripe account (status={}, payoutsEnabled={}). Skipping payout transfer.",
                    driverId, financialProfile != null ? financialProfile.getStripeAccountStatus() : "NULL", isPayoutsEnabled);

            DriverPayoutTransaction skippedTx = DriverPayoutTransaction.builder()
                    .bookingId(bookingId)
                    .driverId(driverId)
                    .stripeAccountId(stripeAccountId)
                    .stripeTransferId("SKIPPED_NOT_CONNECTED")
                    .totalFare(totalFare)
                    .commissionRate(appliedRate)
                    .commissionAmount(commissionAmount)
                    .netDriverIncome(netDriverIncome)
                    .debtBefore(debtBefore)
                    .debtDeducted(BigDecimal.ZERO)
                    .debtAfter(debtBefore)
                    .finalPayoutAmount(BigDecimal.ZERO)
                    .status(PayoutStatus.SKIPPED_NOT_ONBOARDED)
                    .failureReason("Driver Stripe account is not ACTIVE or payouts are disabled")
                    .build();

            return driverPayoutTransactionRepository.save(skippedTx);
        }

        // 5. Apply 3-Case Debt Offset Algorithm
        BigDecimal debtDeducted;
        BigDecimal finalTransfer;
        BigDecimal debtAfter;
        PayoutStatus payoutStatus;
        String stripeTransferId = null;

        if (debtBefore.compareTo(BigDecimal.ZERO) <= 0) {
            // Case 1: Driver has NO debt
            debtDeducted = BigDecimal.ZERO;
            finalTransfer = netDriverIncome;
            debtAfter = BigDecimal.ZERO;
            payoutStatus = PayoutStatus.COMPLETED;
            log.info("[PayoutService][Case 1] No debt. Full net income {} transferred to driver", finalTransfer);

        } else if (debtBefore.compareTo(netDriverIncome) < 0) {
            // Case 2: Debt exists but is LESS than net income
            debtDeducted = debtBefore;
            finalTransfer = netDriverIncome.subtract(debtDeducted);
            debtAfter = BigDecimal.ZERO;
            payoutStatus = PayoutStatus.COMPLETED;
            log.info("[PayoutService][Case 2] Partial debt offset: debtDeducted={}, finalTransfer={}", debtDeducted, finalTransfer);

        } else {
            // Case 3: Debt is GREATER THAN OR EQUAL to net income
            debtDeducted = netDriverIncome;
            finalTransfer = BigDecimal.ZERO;
            debtAfter = debtBefore.subtract(debtDeducted);
            payoutStatus = PayoutStatus.FULL_DEBT_OFFSET;
            stripeTransferId = "N/A_FULL_OFFSET";
            log.info("[PayoutService][Case 3] 100% net income {} used to offset debt. Remaining debt: {}", netDriverIncome, debtAfter);
        }

        // 6. Execute Stripe Transfer API (ONLY if finalTransfer > 0)
        if (finalTransfer.compareTo(BigDecimal.ZERO) > 0) {
            try {
                // Zero-decimal VND rule: integer amount in VND
                TransferCreateParams transferParams = TransferCreateParams.builder()
                        .setAmount(finalTransfer.longValue())
                        .setCurrency("vnd")
                        .setDestination(stripeAccountId)
                        .setDescription("Payout for RideUp booking " + bookingId)
                        .putMetadata("bookingId", bookingId)
                        .putMetadata("driverId", driverId)
                        .build();

                Transfer transfer = Transfer.create(transferParams);
                stripeTransferId = transfer.getId();
                log.info("[PayoutService] Stripe Transfer succeeded: transferId={}, amount={} VND to destination={}",
                        stripeTransferId, finalTransfer, stripeAccountId);

            } catch (StripeException e) {
                log.error("[PayoutService] Stripe Transfer failed for booking {}: {}", bookingId, e.getMessage(), e);

                DriverPayoutTransaction failedTx = DriverPayoutTransaction.builder()
                        .bookingId(bookingId)
                        .driverId(driverId)
                        .stripeAccountId(stripeAccountId)
                        .totalFare(totalFare)
                        .commissionRate(appliedRate)
                        .commissionAmount(commissionAmount)
                        .netDriverIncome(netDriverIncome)
                        .debtBefore(debtBefore)
                        .debtDeducted(BigDecimal.ZERO)
                        .debtAfter(debtBefore)
                        .finalPayoutAmount(BigDecimal.ZERO)
                        .status(PayoutStatus.FAILED)
                        .failureReason("Stripe Transfer failed: " + e.getMessage())
                        .build();

                driverPayoutTransactionRepository.save(failedTx);
                throw new AppException(ErrorCode.PAYOUT_TRANSACTION_FAILED);
            }
        }

        // 7. Deduct Debt in identity-service if debt was offset
        if (debtDeducted.compareTo(BigDecimal.ZERO) > 0) {
            try {
                identityServiceClient.deductDebtInternal(driverId, debtDeducted);
                log.info("[PayoutService] Deducted debt of {} VND for driver {} in identity-service", debtDeducted, driverId);
            } catch (Exception e) {
                log.error("[PayoutService] Warning: Failed to deduct debt in identity-service for driver {}: {}",
                        driverId, e.getMessage(), e);
            }
        }

        // 8. Record Ledger Entry in Database
        DriverPayoutTransaction transaction = DriverPayoutTransaction.builder()
                .bookingId(bookingId)
                .driverId(driverId)
                .stripeAccountId(stripeAccountId)
                .stripeTransferId(stripeTransferId)
                .totalFare(totalFare)
                .commissionRate(appliedRate)
                .commissionAmount(commissionAmount)
                .netDriverIncome(netDriverIncome)
                .debtBefore(debtBefore)
                .debtDeducted(debtDeducted)
                .debtAfter(debtAfter)
                .finalPayoutAmount(finalTransfer)
                .status(payoutStatus)
                .build();

        DriverPayoutTransaction savedTx = driverPayoutTransactionRepository.save(transaction);
        log.info("[PayoutService] Successfully completed payout ledger: txId={}, bookingId={}, status={}, finalPayout={}, debtAfter={}",
                savedTx.getId(), bookingId, savedTx.getStatus(), savedTx.getFinalPayoutAmount(), savedTx.getDebtAfter());

        return savedTx;
    }

    @Transactional(readOnly = true)
    public List<DriverPayoutResponse> getDriverPayouts(String driverId) {
        return driverPayoutTransactionRepository.findByDriverIdOrderByCreatedAtDesc(driverId)
                .stream()
                .map(this::toPayoutResponse)
                .collect(Collectors.toList());
    }

    private DriverFinancialProfileResponse fetchDriverFinancialProfile(String driverId) {
        try {
            ApiResponse<DriverFinancialProfileResponse> response = identityServiceClient.getDriverFinancialProfile(driverId);
            if (response != null && response.getResult() != null) {
                return response.getResult();
            }
        } catch (Exception e) {
            log.warn("[PayoutService] Failed to fetch driver financial profile for {}: {}", driverId, e.getMessage());
        }
        return null;
    }

    private BigDecimal fetchDriverCommissionRate(String driverId) {
        try {
            ApiResponse<DriverCommissionRateResponse> response = identityServiceClient.getCommissionRateInternal(driverId);
            if (response != null && response.getResult() != null && response.getResult().getEffectiveRate() != null) {
                return response.getResult().getEffectiveRate();
            }
        } catch (Exception e) {
            log.warn("[PayoutService] Failed to fetch commission rate for {}: {}. Defaulting to 0.18", driverId, e.getMessage());
        }
        return new BigDecimal("0.18");
    }

    private DriverPayoutResponse toPayoutResponse(DriverPayoutTransaction tx) {
        return DriverPayoutResponse.builder()
                .id(tx.getId())
                .bookingId(tx.getBookingId())
                .driverId(tx.getDriverId())
                .stripeAccountId(tx.getStripeAccountId())
                .stripeTransferId(tx.getStripeTransferId())
                .totalFare(tx.getTotalFare())
                .commissionRate(tx.getCommissionRate())
                .commissionAmount(tx.getCommissionAmount())
                .netDriverIncome(tx.getNetDriverIncome())
                .debtBefore(tx.getDebtBefore())
                .debtDeducted(tx.getDebtDeducted())
                .debtAfter(tx.getDebtAfter())
                .finalPayoutAmount(tx.getFinalPayoutAmount())
                .status(tx.getStatus())
                .failureReason(tx.getFailureReason())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
