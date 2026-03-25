package com.rideUp.payment_service.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideUp.payment_service.dto.event.PaymentCompletedEvent;
import com.rideUp.payment_service.dto.event.PaymentFailedEvent;
import com.rideUp.payment_service.entity.Payment;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentEventPublisher {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @Value("${app.kafka.topics.payment-completed}")
    String paymentCompletedTopic;

    @Value("${app.kafka.topics.payment-failed}")
    String paymentFailedTopic;


    public void publishPaymentCompleted(Payment payment) {
        PaymentCompletedEvent event = PaymentCompletedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .bookingId(payment.getBookingId())
                .paymentId(payment.getId())
                .processedAt(LocalDateTime.now())
                .build();

        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(paymentCompletedTopic, event.getBookingId(), payload);
            log.info("Published PaymentCompletedEvent eventId={}, bookingId={}, paymentId={}",
                    event.getEventId(), event.getBookingId(), event.getPaymentId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize PaymentCompletedEvent", ex);
        }
    }

    public void publishPaymentFailed(Payment payment, String reason) {
        PaymentFailedEvent event = PaymentFailedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .bookingId(payment.getBookingId())
                .paymentId(payment.getId())
                .reason(reason)
                .processedAt(LocalDateTime.now())
                .build();

        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(paymentFailedTopic, event.getBookingId(), payload);
            log.info("Published PaymentFailedEvent eventId={}, bookingId={}, paymentId={}",
                    event.getEventId(), event.getBookingId(), event.getPaymentId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize PaymentFailedEvent", ex);
        }
    }
}
