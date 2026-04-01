package com.rideUp.booking_service.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideUp.booking_service.dto.event.BookingCancelledEvent;
import com.rideUp.booking_service.dto.event.BookingConfirmedEvent;
import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
import com.rideUp.booking_service.dto.event.SeatReleaseEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingEventPublisher{

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @NonFinal
    @Value("${app.kafka.topics.payment-requested}")
    String paymentRequestedTopic;

    @NonFinal
    @Value("${app.kafka.topics.booking-confirmed}")
    String bookingConfirmedTopic;

    @NonFinal
    @Value("${app.kafka.topics.booking-cancelled}")
    String bookingCancelledTopic;

    @NonFinal
    @Value("${app.kafka.topics.seat-release}")
    String seatReleaseTopic;

    public void publishPaymentRequested(PaymentRequestedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(paymentRequestedTopic, event.getBookingId(), payload);
            log.info("Published PaymentRequestedEvent eventId={}, bookingId={}, paymentMethod={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getPaymentMethod(), event.getCorrelationId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize PaymentRequestedEvent", ex);
        }
    }

    public void publishBookingConfirmed(BookingConfirmedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(bookingConfirmedTopic, event.getBookingId(), payload);
            log.info("Published BookingConfirmedEvent eventId={}, bookingId={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getCorrelationId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize BookingConfirmedEvent", ex);
        }
    }

    public void publishBookingCancelled(BookingCancelledEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(bookingCancelledTopic, event.getBookingId(), payload);
            log.info("Published BookingCancelledEvent eventId={}, bookingId={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getCorrelationId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize BookingCancelledEvent", ex);
        }
    }

    public void publishSeatRelease(SeatReleaseEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(seatReleaseTopic, event.getBookingId(), payload);
            log.info("Published SeatReleaseEvent eventId={}, bookingId={}, tripId={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getTripId(), event.getCorrelationId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize SeatReleaseEvent", ex);
        }
    }
}
