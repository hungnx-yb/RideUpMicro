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

        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
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
                } else {
                    refund.setStatus(RefundStatus.FAILED);
                    refund.setResponseCode(stripeRefund.getStatus());
                    refund.setFailureReason("Stripe refund failed: " + stripeRefund.getStatus());
                }
            } else {
                throw new AppException(ErrorCode.REFUND_FAILED); // Hoặc tạo mã lỗi riêng cho method không hỗ trợ refund
            }
            
            refundRepository.save(refund);
            paymentRepository.save(payment);
        } catch (Exception ex) {
            refund.setStatus(RefundStatus.FAILED);
            refund.setFailureReason(ex.getMessage());
            refundRepository.save(refund);
            throw new AppException(ErrorCode.REFUND_FAILED);
        }
        return modelMapper.map(refund, RefundResponse.class);
    }
}
