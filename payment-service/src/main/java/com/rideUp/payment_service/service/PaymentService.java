package com.rideUp.payment_service.service;

import com.rideUp.payment_service.config.VnpayConfig;
import com.rideUp.payment_service.dto.request.CreatePaymentRequest;
import com.rideUp.payment_service.dto.request.MarkPaymentFailedRequest;
import com.rideUp.payment_service.dto.request.MarkPaymentPaidRequest;
import com.rideUp.payment_service.dto.response.PaymentResponse;
import com.rideUp.payment_service.entity.Payment;
import com.rideUp.payment_service.enums.PaymentMethod;
import com.rideUp.payment_service.enums.PaymentStatus;
import com.rideUp.payment_service.exception.AppException;
import com.rideUp.payment_service.exception.ErrorCode;
import com.rideUp.payment_service.kafka.producer.PaymentEventPublisher;
import com.rideUp.payment_service.repository.PaymentRepository;
import com.rideUp.payment_service.util.VnpayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentService {

	PaymentRepository paymentRepository;
	PaymentEventPublisher paymentEventPublisher;
	VnpayConfig vnpayConfig;

	@Transactional
	public PaymentResponse createPayment(CreatePaymentRequest request, HttpServletRequest httpServletRequest) {
		if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
			throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT);
		}

		Payment existingPayment = paymentRepository.findByBookingId(request.getBookingId()).orElse(null);
		if (existingPayment != null) {
			return toResponse(existingPayment);
		}

		Payment payment = Payment.builder()
				.bookingId(request.getBookingId())
				.amount(request.getAmount())
				.method(request.getPaymentMethod())
				.status(PaymentStatus.PENDING)
				.build();

		if (request.getPaymentMethod() == PaymentMethod.CASH) {
			payment.setStatus(PaymentStatus.PAID);
			payment.setTransactionId("CASH-" + UUID.randomUUID());
			payment.setPaidAt(LocalDateTime.now());
		}

		Payment savedPayment = paymentRepository.save(payment);

		if (request.getPaymentMethod() == PaymentMethod.VNPAY) {
			String clientIp = httpServletRequest == null ? "127.0.0.1" : VnpayUtil.getIpAddress(httpServletRequest);
			String paymentUrl = generateVnpayPaymentUrl(savedPayment, clientIp);
			savedPayment.setPaymentUrl(paymentUrl);
			savedPayment.setTransactionId(savedPayment.getId());
			savedPayment = paymentRepository.save(savedPayment);
		}

		if (savedPayment.getStatus() == PaymentStatus.PAID) {
			publishPaymentCompleted(savedPayment);
		}

		return toResponse(savedPayment);
	}

	@Transactional
	public PaymentResponse processVnpayCallback(Map<String, String> callbackParams) {
		String receivedSignature = callbackParams.get("vnp_SecureHash");
		if (receivedSignature == null || receivedSignature.isBlank()) {
			throw new AppException(ErrorCode.INVALID_VNPAY_SIGNATURE);
		}

		Map<String, String> signData = new HashMap<>(callbackParams);
		signData.remove("vnp_SecureHash");
		signData.remove("vnp_SecureHashType");

		String calculatedSignature = VnpayUtil.hmacSHA512(
				vnpayConfig.getSecretKey(),
				VnpayUtil.getPaymentURL(signData, false)
		);

		if (!receivedSignature.equalsIgnoreCase(calculatedSignature)) {
			throw new AppException(ErrorCode.INVALID_VNPAY_SIGNATURE);
		}

		String paymentId = callbackParams.get("vnp_TxnRef");
		if (paymentId == null || paymentId.isBlank()) {
			throw new AppException(ErrorCode.INVALID_VNPAY_CALLBACK);
		}

		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

		if (payment.getStatus() == PaymentStatus.PAID || payment.getStatus() == PaymentStatus.FAILED) {
			return toResponse(payment);
		}

		String responseCode = callbackParams.get("vnp_ResponseCode");
		String transactionNo = callbackParams.get("vnp_TransactionNo");

		if ("00".equals(responseCode)) {
			payment.setStatus(PaymentStatus.PAID);
			payment.setTransactionId(transactionNo == null || transactionNo.isBlank() ? payment.getTransactionId() : transactionNo);
			payment.setFailureReason(null);
			payment.setPaidAt(LocalDateTime.now());

			Payment savedPayment = paymentRepository.save(payment);
			publishPaymentCompleted(savedPayment);
			return toResponse(savedPayment);
		}

		payment.setStatus(PaymentStatus.FAILED);
		payment.setFailureReason("VNPay response code: " + responseCode);
		payment.setPaidAt(null);

		Payment savedPayment = paymentRepository.save(payment);
		publishPaymentFailed(savedPayment, savedPayment.getFailureReason());
		return toResponse(savedPayment);
	}

	@Transactional(readOnly = true)
	public PaymentResponse getPaymentById(String paymentId) {
		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
		return toResponse(payment);
	}

	@Transactional(readOnly = true)
	public PaymentResponse getPaymentByBookingId(String bookingId) {
		Payment payment = paymentRepository.findByBookingId(bookingId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
		return toResponse(payment);
	}

	@Transactional
	public PaymentResponse markPaymentPaid(String paymentId, MarkPaymentPaidRequest request) {
		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

		if (payment.getStatus() == PaymentStatus.PAID) {
			return toResponse(payment);
		}

		if (payment.getStatus() == PaymentStatus.FAILED) {
			throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
		}

		payment.setStatus(PaymentStatus.PAID);
		payment.setTransactionId(request.getTransactionId());
		payment.setFailureReason(null);
		payment.setPaidAt(LocalDateTime.now());

		Payment savedPayment = paymentRepository.save(payment);
		publishPaymentCompleted(savedPayment);
		return toResponse(savedPayment);
	}

	@Transactional
	public PaymentResponse markPaymentFailed(String paymentId, MarkPaymentFailedRequest request) {
		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

		if (payment.getStatus() == PaymentStatus.PAID) {
			throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
		}

		if (payment.getStatus() == PaymentStatus.FAILED) {
			return toResponse(payment);
		}

		payment.setStatus(PaymentStatus.FAILED);
		payment.setFailureReason(request.getReason());
		payment.setPaidAt(null);

		Payment savedPayment = paymentRepository.save(payment);
		publishPaymentFailed(savedPayment, request.getReason());
		return toResponse(savedPayment);
	}

	private void publishPaymentCompleted(Payment payment) {
		try {
			paymentEventPublisher.publishPaymentCompleted(payment);
		} catch (Exception ex) {
			log.error("Failed to publish payment-completed event for bookingId={}", payment.getBookingId(), ex);
			throw new AppException(ErrorCode.KAFKA_PUBLISH_FAILED);
		}
	}

	private void publishPaymentFailed(Payment payment, String reason) {
		try {
			paymentEventPublisher.publishPaymentFailed(payment, reason);
		} catch (Exception ex) {
			log.error("Failed to publish payment-failed event for bookingId={}", payment.getBookingId(), ex);
			throw new AppException(ErrorCode.KAFKA_PUBLISH_FAILED);
		}
	}

	private PaymentResponse toResponse(Payment payment) {
		return PaymentResponse.builder()
				.id(payment.getId())
				.bookingId(payment.getBookingId())
				.amount(payment.getAmount())
				.method(payment.getMethod())
				.status(payment.getStatus())
				.transactionId(payment.getTransactionId())
				.paymentUrl(payment.getPaymentUrl())
				.failureReason(payment.getFailureReason())
				.paidAt(payment.getPaidAt())
				.createdAt(payment.getCreatedAt())
				.updatedAt(payment.getUpdatedAt())
				.build();
	}

	private String generateVnpayPaymentUrl(Payment payment, String clientIp) {
		Map<String, String> params = vnpayConfig.getBaseParams();

		Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
		SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
		String createDate = formatter.format(calendar.getTime());
		calendar.add(Calendar.MINUTE, vnpayConfig.getExpireMinutes());
		String expireDate = formatter.format(calendar.getTime());

		BigDecimal amount = payment.getAmount();
		long vnpAmount = amount.multiply(BigDecimal.valueOf(100)).longValue();

		params.put("vnp_Amount", String.valueOf(vnpAmount));
		params.put("vnp_IpAddr", clientIp);
		params.put("vnp_TxnRef", payment.getId());
		params.put("vnp_OrderInfo", "Thanh toan booking " + payment.getBookingId());
		params.put("vnp_CreateDate", createDate);
		params.put("vnp_ExpireDate", expireDate);

		String queryUrl = VnpayUtil.getPaymentURL(params, true);
		String hashData = VnpayUtil.getPaymentURL(params, false);
		String secureHash = VnpayUtil.hmacSHA512(vnpayConfig.getSecretKey(), hashData);
		return vnpayConfig.getPayUrl() + "?" + queryUrl + "&vnp_SecureHash=" + secureHash;
	}
}
