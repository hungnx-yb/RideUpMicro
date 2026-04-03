package com.rideUp.payment_service.service;

import com.rideUp.payment_service.config.VnpayConfig;
import com.rideUp.payment_service.dto.request.RefundRequest;
import com.rideUp.payment_service.dto.response.PaymentResponse;
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
import com.rideUp.payment_service.util.VnpayUtil;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RefundService {

    PaymentRepository paymentRepository;
    RefundRepository refundRepository;
    VnpayConfig vnpayConfig;
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
            Map<String, String> params = buildRefundParams(payment, requestId);

            String hashData = buildRefundHashData(params);
            String secureHash = VnpayUtil.hmacSHA512(vnpayConfig.getSecretKey(), hashData);

            params.put("vnp_SecureHash", secureHash);
            String response = VnpayUtil.callApi(vnpayConfig.getRefundUrl(), params);
            Map<String, String> responseMap = VnpayUtil.parseResponse(response);

            String responseCode = responseMap.get("vnp_ResponseCode");

            if ("00".equals(responseCode) ) {
                refund.setStatus(RefundStatus.SUCCESS);
                refund.setResponseCode(responseCode);
                refund.setRefundedAt(LocalDateTime.now());
                payment.setStatus(PaymentStatus.REFUNDED);
                paymentServicePublisher.publishRefundCompleted(refund, refundRequest.getBookingId());
            } else {
                refund.setStatus(RefundStatus.FAILED);
                refund.setResponseCode(responseCode);
                refund.setFailureReason("VNPay refund failed: " + responseCode);
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

    private Map<String, String> buildRefundParams(Payment payment, String requestId) {

        Map<String, String> params = new HashMap<>();

        params.put("vnp_RequestId", requestId);
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "refund");
        params.put("vnp_TmnCode", vnpayConfig.getTmnCode());

        long amount = payment.getAmount()
                .multiply(BigDecimal.valueOf(100))
                .longValue();

        params.put("vnp_Amount", String.valueOf(amount));
        params.put("vnp_TxnRef", payment.getId());
        params.put("vnp_TransactionNo", payment.getTransactionId());

        params.put("vnp_TransactionType", "02");
        params.put("vnp_TransactionDate", payment.getPayDate());

        params.put("vnp_OrderInfo", "Refund booking " + payment.getBookingId());
        params.put("vnp_CreateBy", "system");

        String createDate = new SimpleDateFormat("yyyyMMddHHmmss")
                .format(new Date());

        params.put("vnp_CreateDate", createDate);
        params.put("vnp_IpAddr", "127.0.0.1");

        return params;
    }

    public static String buildRefundHashData(Map<String, String> params) {
        return String.join("|",
                params.get("vnp_RequestId"),
                params.get("vnp_Version"),
                params.get("vnp_Command"),
                params.get("vnp_TmnCode"),
                params.get("vnp_TransactionType"),
                params.get("vnp_TxnRef"),
                params.get("vnp_Amount"),
                params.get("vnp_TransactionNo"),
                params.get("vnp_TransactionDate"),
                params.get("vnp_CreateBy"),
                params.get("vnp_CreateDate"),
                params.get("vnp_IpAddr"),
                params.get("vnp_OrderInfo")
        );
    }
}
