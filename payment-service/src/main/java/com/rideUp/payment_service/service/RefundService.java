package com.rideUp.payment_service.service;

import com.rideUp.payment_service.enums.PaymentMethod;
import com.rideUp.payment_service.dto.request.RefundRequest;
import com.rideUp.payment_service.dto.response.RefundResponse;
import com.rideUp.payment_service.entity.Payment;
import com.rideUp.payment_service.entity.Refund;
import com.rideUp.payment_service.enums.PaymentStatus;
import com.rideUp.payment_service.enums.RefundStatus;
import com.rideUp.payment_service.exception.AppException;
import com.rideUp.payment_service.exception.ErrorCode;
import com.rideUp.payment_service.kafka.producer.PaymentServicePublisher;
import com.rideUp.payment_service.repository.PaymentRepository;
import com.rideUp.payment_service.repository.RefundRepository;
import com.stripe.param.RefundCreateParams;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RefundService {

    PaymentRepository paymentRepository;
    RefundRepository refundRepository;
    ModelMapper modelMapper;
    PaymentServicePublisher paymentServicePublisher;

    @Transactional
    public RefundResponse refundPayment(RefundRequest refundRequest ) {

        Payment payment = paymentRepository.findByBookingId(refundRequest.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus() == PaymentStatus.REFUNDED || payment.getStatus() == PaymentStatus.VOIDED) {
            log.info("Payment for bookingId={} already refunded or voided", refundRequest.getBookingId());
            return modelMapper.map(payment, RefundResponse.class);
        }

        if (refundRepository.existsByPayment_Id(payment.getId())) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_REFUNDED);
        }

        String requestId = UUID.randomUUID().toString();

        Refund refund = Refund.builder()
                .payment(payment)
                .amount(payment.getAmount())
                .status(RefundStatus.PENDING)
                .requestId(requestId)
                .correlationId(refundRequest.getCorrelationId())
                .build();

        refund = refundRepository.save(refund);

        try {
            if (payment.getMethod() == PaymentMethod.STRIPE) {
                if (payment.getStatus() == PaymentStatus.HOLDING) {
                    // Tiền đang tạm giữ (chưa capture vào ví): Cancel authorization để nhả tiền ngay lập tức
                    try {
                        com.stripe.model.PaymentIntent paymentIntent = com.stripe.model.PaymentIntent.retrieve(payment.getTransactionId());
                        paymentIntent.cancel();
                    } catch (Exception ex) {
                        log.warn("PaymentIntent cancel warning for bookingId={}: {}", refundRequest.getBookingId(), ex.getMessage());
                    }
                    refund.setStatus(RefundStatus.SUCCESS);
                    refund.setResponseCode("00");
                    refund.setRefundedAt(LocalDateTime.now());
                    payment.setStatus(PaymentStatus.VOIDED);
                    paymentServicePublisher.publishRefundCompleted(refund, refundRequest.getBookingId());
                    log.info("Successfully cancelled hold and released authorization for bookingId={}", refundRequest.getBookingId());
                } else if (payment.getStatus() == PaymentStatus.PAID) {
                    // Tiền đã capture vào ví: Gọi Stripe Refund API để hoàn tiền 100%
                    RefundCreateParams refundParams = RefundCreateParams.builder()
                            .setPaymentIntent(payment.getTransactionId())
                            .build();
                    com.stripe.model.Refund stripeRefund = com.stripe.model.Refund.create(refundParams);

                    if ("succeeded".equals(stripeRefund.getStatus())) {
                        refund.setStatus(RefundStatus.SUCCESS);
                        refund.setResponseCode("00");
                        refund.setRefundedAt(LocalDateTime.now());
                        payment.setStatus(PaymentStatus.REFUNDED);
                        paymentServicePublisher.publishRefundCompleted(refund, refundRequest.getBookingId());
                        log.info("Successfully refunded captured payment for bookingId={}", refundRequest.getBookingId());
                    } else {
                        refund.setStatus(RefundStatus.FAILED);
                        refund.setResponseCode(stripeRefund.getStatus());
                        refund.setFailureReason("Stripe refund failed: " + stripeRefund.getStatus());
                    }
                } else {
                    log.info("Payment for bookingId={} is status={}, marking voided/refunded", refundRequest.getBookingId(), payment.getStatus());
                    refund.setStatus(RefundStatus.SUCCESS);
                    payment.setStatus(PaymentStatus.VOIDED);
                }
            } else {
                refund.setStatus(RefundStatus.SUCCESS);
                payment.setStatus(PaymentStatus.VOIDED);
            }
            
            refundRepository.save(refund);
            paymentRepository.save(payment);
        } catch (Exception ex) {
            log.error("Failed to process refund for bookingId={}", refundRequest.getBookingId(), ex);
            refund.setStatus(RefundStatus.FAILED);
            refund.setFailureReason(ex.getMessage());
            refundRepository.save(refund);
            throw new AppException(ErrorCode.REFUND_FAILED);
        }
        return modelMapper.map(refund, RefundResponse.class);
    }
}
