package com.rideUp.booking_service.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingEventPublisher implements com.rideUp.booking_service.application.port.out.BookingEventPublisher {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @Value("${app.kafka.topics.payment-requested}")
    String paymentRequestedTopic;

    @Override
    public void publishPaymentRequested(PaymentRequestedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(paymentRequestedTopic, event.getBookingId(), payload);
            log.info("Published PaymentRequestedEvent eventId={}, bookingId={}, paymentMethod={}",
                    event.getEventId(), event.getBookingId(), event.getPaymentMethod());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize PaymentRequestedEvent", ex);
        }
    }
}
