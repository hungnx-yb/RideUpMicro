package com.rideUp.payment_service.service;

import com.rideUp.payment_service.dto.request.CreatePaymentRequest;
import com.rideUp.payment_service.dto.request.MarkPaymentFailedRequest;
import com.rideUp.payment_service.dto.request.MarkPaymentPaidRequest;
import com.rideUp.payment_service.dto.response.PaymentResponse;
import com.rideUp.payment_service.entity.Payment;
import com.rideUp.payment_service.enums.PaymentMethod;
import com.rideUp.payment_service.enums.PaymentStatus;
import com.rideUp.payment_service.exception.AppException;
import com.rideUp.payment_service.exception.ErrorCode;
import com.rideUp.payment_service.kafka.producer.PaymentServicePublisher;
import com.rideUp.payment_service.repository.PaymentRepository;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
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
	PaymentServicePublisher paymentServicePublisher;
	ModelMapper modelMapper;
    com.rideUp.payment_service.feignClient.IdentityServiceClient identityServiceClient;

	@Transactional
	public PaymentResponse createPayment(CreatePaymentRequest request) {
		log.info("Creating payment for bookingId={}, method={}, correlationId={}",
				request.getBookingId(), request.getPaymentMethod(), request.getCorrelationId());

		if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
			throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT);
		}

		Payment existingPayment = paymentRepository.findByBookingId(request.getBookingId()).orElse(null);
		if (existingPayment != null) {
			if ((existingPayment.getCorrelationId() == null || existingPayment.getCorrelationId().isBlank())
					&& request.getCorrelationId() != null && !request.getCorrelationId().isBlank()) {
				existingPayment.setCorrelationId(request.getCorrelationId());
				existingPayment = paymentRepository.save(existingPayment);
			}
			return modelMapper.map(existingPayment, PaymentResponse.class);
		}

		Payment payment = Payment.builder()
				.bookingId(request.getBookingId())
				.correlationId(request.getCorrelationId())
				.amount(request.getAmount())
				.method(request.getPaymentMethod())
				.status(PaymentStatus.PENDING)
				.build();

		if (request.getPaymentMethod() == PaymentMethod.CASH) {
			payment.setStatus(PaymentStatus.PENDING);
			payment.setTransactionId("CASH-" + UUID.randomUUID());
		}

		Payment savedPayment = paymentRepository.save(payment);

		if (request.getPaymentMethod() == PaymentMethod.STRIPE) {
			try {
				PaymentIntentCreateParams params =
						com.stripe.param.PaymentIntentCreateParams.builder()
								.setAmount(savedPayment.getAmount().longValue())
								.setCurrency("vnd")
								.setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.MANUAL)
								.putMetadata("bookingId", savedPayment.getBookingId())
								.putMetadata("paymentId", savedPayment.getId())
								.build();
				PaymentIntent paymentIntent = PaymentIntent.create(params);
				savedPayment.setPaymentUrl(paymentIntent.getClientSecret()); 
				savedPayment.setTransactionId(paymentIntent.getId());
				savedPayment = paymentRepository.save(savedPayment);
			} catch (StripeException e) {
				log.error("Stripe error: ", e);
				throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
			}
		}

		return modelMapper.map(savedPayment, PaymentResponse.class);
	}


	@Transactional(readOnly = true)
	public PaymentResponse getPaymentByBookingId(String bookingId) {
		Payment payment = paymentRepository.findByBookingId(bookingId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
		return modelMapper.map(payment, PaymentResponse.class);
	}

	@Transactional
	public PaymentResponse authorizePayment(String paymentId, MarkPaymentPaidRequest request) {
		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

		if (payment.getMethod() != PaymentMethod.STRIPE) {
			throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
		}

		if (payment.getStatus() == PaymentStatus.HOLDING || payment.getStatus() == PaymentStatus.PAID) {
			return modelMapper.map(payment, PaymentResponse.class);
		}

		if (payment.getStatus() == PaymentStatus.FAILED) {
			throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
		}

		try {
			PaymentIntent paymentIntent = PaymentIntent.retrieve(request.getTransactionId());
			if (!"requires_capture".equals(paymentIntent.getStatus())) {
				log.error("Stripe verification failed for payment {}. Actual Stripe status: {}", paymentId, paymentIntent.getStatus());
				throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
			}
		} catch (com.stripe.exception.StripeException e) {
			log.error("Error retrieving Stripe PaymentIntent: ", e);
			throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
		}

		payment.setStatus(PaymentStatus.HOLDING);
		payment.setTransactionId(request.getTransactionId());
		payment.setFailureReason(null);

		Payment savedPayment = paymentRepository.save(payment);
		publishPaymentAuthorized(savedPayment);
		return modelMapper.map(savedPayment, PaymentResponse.class);
	}

	@Transactional
	public PaymentResponse markPaymentFailed(String paymentId, MarkPaymentFailedRequest request) {
		Payment payment = paymentRepository.findById(paymentId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

		if (payment.getStatus() == PaymentStatus.PAID) {
			throw new AppException(ErrorCode.PAYMENT_STATUS_INVALID);
		}

		if (payment.getStatus() == PaymentStatus.FAILED) {
			return modelMapper.map(payment, PaymentResponse.class);
		}

		payment.setStatus(PaymentStatus.FAILED);
		payment.setFailureReason(request.getReason());
		payment.setPaidAt(null);

		Payment savedPayment = paymentRepository.save(payment);
		publishPaymentFailed(savedPayment, request.getReason());
		return modelMapper.map(savedPayment, PaymentResponse.class);
	}

	private void publishPaymentCompleted(Payment payment) {
		try {
			paymentServicePublisher.publishPaymentCompleted(payment);
		} catch (Exception ex) {
			log.error("Failed to publish payment-completed event for bookingId={}", payment.getBookingId(), ex);
			throw new AppException(ErrorCode.KAFKA_PUBLISH_FAILED);
		}
	}

	private void publishPaymentFailed(Payment payment, String reason) {
		try {
			paymentServicePublisher.publishPaymentFailed(payment, reason);
		} catch (Exception ex) {
			log.error("Failed to publish payment-failed event for bookingId={}", payment.getBookingId(), ex);
			throw new AppException(ErrorCode.KAFKA_PUBLISH_FAILED);
		}
	}



	private void publishPaymentAuthorized(Payment payment) {
		try {
			paymentServicePublisher.publishPaymentAuthorized(payment);
		} catch (Exception ex) {
			log.error("Failed to publish payment-authorized event for bookingId={}", payment.getBookingId(), ex);
			throw new AppException(ErrorCode.KAFKA_PUBLISH_FAILED);
		}
	}

	@Transactional
	public void capturePayment(String bookingId) {
		Payment payment = paymentRepository.findByBookingId(bookingId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

		if (payment.getMethod() != PaymentMethod.STRIPE || payment.getStatus() != PaymentStatus.HOLDING) {
			return;
		}

		try {
			PaymentIntent paymentIntent = PaymentIntent.retrieve(payment.getTransactionId());
			paymentIntent.capture();
			payment.setStatus(PaymentStatus.PAID);
			payment.setPaidAt(LocalDateTime.now());
			paymentRepository.save(payment);
			publishPaymentCompleted(payment);
		} catch (StripeException e) {
			log.error("Failed to capture payment for bookingId={}", bookingId, e);
			payment.setStatus(PaymentStatus.FAILED);
			payment.setFailureReason("Capture failed: " + e.getMessage());
			paymentRepository.save(payment);
			publishPaymentFailed(payment, e.getMessage());
		}
	}

	@Transactional
	public void cancelPayment(String bookingId) {
		Payment payment = paymentRepository.findByBookingId(bookingId)
				.orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

		if (payment.getMethod() != PaymentMethod.STRIPE || payment.getStatus() != PaymentStatus.HOLDING) {
			if (payment.getMethod() == PaymentMethod.CASH) {
				payment.setStatus(PaymentStatus.VOIDED);
				paymentRepository.save(payment);
			}
			return;
		}

		try {
			PaymentIntent paymentIntent = PaymentIntent.retrieve(payment.getTransactionId());
			paymentIntent.cancel();
			payment.setStatus(PaymentStatus.VOIDED);
			paymentRepository.save(payment);
		} catch (StripeException e) {
			log.error("Failed to cancel payment for bookingId={}", bookingId, e);
		}
	}

    @Transactional
    public PaymentResponse depositWallet() {
        var userResponse = identityServiceClient.getUserInfo();
        if (userResponse == null || userResponse.getResult() == null) {
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }
        String driverId = userResponse.getResult().getId();

        var walletResponse = identityServiceClient.getMyWallet();
        if (walletResponse == null || walletResponse.getResult() == null) {
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }
        BigDecimal debt = walletResponse.getResult();

        if (debt.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT); // Cannot deposit if no debt
        }

        Payment payment = Payment.builder()
                .bookingId("DEPOSIT-" + driverId) // Mock bookingId for deposit
                .correlationId(UUID.randomUUID().toString())
                .amount(debt)
                .method(PaymentMethod.STRIPE)
                .status(PaymentStatus.PENDING)
                .build();
        
        Payment savedPayment = paymentRepository.save(payment);

        try {
            PaymentIntentCreateParams params =
                    com.stripe.param.PaymentIntentCreateParams.builder()
                            .setAmount(savedPayment.getAmount().longValue())
                            .setCurrency("vnd")
                            .setCaptureMethod(PaymentIntentCreateParams.CaptureMethod.AUTOMATIC)
                            .putMetadata("paymentId", savedPayment.getId())
                            .putMetadata("driverId", driverId)
                            .build();
            PaymentIntent paymentIntent = PaymentIntent.create(params);
            savedPayment.setPaymentUrl(paymentIntent.getClientSecret()); 
            savedPayment.setTransactionId(paymentIntent.getId());
            savedPayment = paymentRepository.save(savedPayment);
        } catch (StripeException e) {
            log.error("Stripe error during deposit: ", e);
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }

        return modelMapper.map(savedPayment, PaymentResponse.class);
    }

    @Transactional
    public void confirmDeposit(String transactionId) {
        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(transactionId);
            if ("succeeded".equals(paymentIntent.getStatus())) {
                String paymentId = paymentIntent.getMetadata().get("paymentId");
                String driverId = paymentIntent.getMetadata().get("driverId");

                Payment payment = paymentRepository.findById(paymentId).orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
                if (payment.getStatus() == PaymentStatus.PAID) {
                    return; // Already processed
                }
                
                payment.setStatus(PaymentStatus.PAID);
                paymentRepository.save(payment);

                // Clear debt by adding a negative amount equal to the debt paid
                BigDecimal debtPaid = payment.getAmount();
                identityServiceClient.addDebtInternal(driverId, debtPaid.negate());
                log.info("Successfully cleared debt of {} for driver {}", debtPaid, driverId);
            } else {
                throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
            }
        } catch (StripeException e) {
            log.error("Stripe error retrieving deposit: ", e);
            throw new AppException(ErrorCode.STRIPE_PAYMENT_FAILED);
        }
    }
}
