package com.rideUp.payment_service.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideUp.payment_service.dto.event.PaymentRequestedEvent;
import com.rideUp.payment_service.dto.request.CreatePaymentRequest;
import com.rideUp.payment_service.enums.PaymentMethod;
import com.rideUp.payment_service.exception.AppException;
import com.rideUp.payment_service.exception.ErrorCode;
import com.rideUp.payment_service.service.PaymentService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentEvenConsumer {

    PaymentService paymentService;
    ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${app.kafka.topics.payment-requested}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onPaymentRequested(String payload) throws Exception {
        PaymentRequestedEvent event = objectMapper.readValue(payload, PaymentRequestedEvent.class);
        String correlationId = event.getCorrelationId();
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
            log.warn("PaymentRequestedEvent without correlationId. Generated correlationId={} for bookingId={}",
                    correlationId, event.getBookingId());
        }

        log.info("[PaymentRequestedEvent] eventId={}, bookingId={}, method={}, correlationId={}",
            event.getEventId(), event.getBookingId(), event.getPaymentMethod(), correlationId);

        PaymentMethod paymentMethod;
        try {
            paymentMethod = PaymentMethod.valueOf(event.getPaymentMethod());
        } catch (Exception ex) {
            log.error("Invalid payment method in PaymentRequestedEvent eventId={}, method={}",
                    event.getEventId(), event.getPaymentMethod());
            return;
        }

        try {
            paymentService.createPayment(
                    CreatePaymentRequest.builder()
                            .bookingId(event.getBookingId())
                            .amount(event.getAmount())
                            .paymentMethod(paymentMethod)
                            .correlationId(correlationId)
                            .build(),
                    null
            );
        } catch (AppException ex) {
            if (ex.getErrorCode() == ErrorCode.INVALID_PAYMENT_AMOUNT) {
                log.error("Invalid amount in PaymentRequestedEvent eventId={}, bookingId={}, amount={}",
                        event.getEventId(), event.getBookingId(), event.getAmount());
                return;
            }
            throw ex;
        }
    }
}
