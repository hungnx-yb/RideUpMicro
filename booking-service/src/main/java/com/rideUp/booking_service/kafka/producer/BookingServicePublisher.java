package com.rideUp.booking_service.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideUp.booking_service.dto.event.BookingCancelledEvent;
import com.rideUp.booking_service.dto.event.BookingConfirmedEvent;
import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
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
public class BookingServicePublisher {

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
    @Value("${app.kafka.topics.booking-cancell-request}")
    String bookingCancellRequestTopic;

    @NonFinal
    @Value("${app.kafka.topics.booking-completed}")
    String bookingCompletedTopic;

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


    public void publishBookingCancellRequest(BookingCancelledEvent event) {
        try{
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(bookingCancellRequestTopic, event.getBookingId(), payload);
            log.info("Published BookingCancellRequestEvent eventId={}, bookingId={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getCorrelationId());
        }
        catch (JsonProcessingException ex){
            throw new IllegalStateException("Failed to serialize BookingCancelledEvent", ex);
        }
    }

    @NonFinal
    @Value("${app.kafka.topics.booking-approved}")
    String bookingApprovedTopic;

    @NonFinal
    @Value("${app.kafka.topics.booking-rejected}")
    String bookingRejectedTopic;

    @NonFinal
    @Value("${app.kafka.topics.booking-waiting-approval}")
    String bookingWaitingApprovalTopic;

    public void publishBookingWaitingApproval(com.rideUp.booking_service.dto.event.BookingWaitingApprovalEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(bookingWaitingApprovalTopic, event.getBookingId(), payload);
            log.info("Published BookingWaitingApprovalEvent eventId={}, bookingId={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getCorrelationId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize BookingWaitingApprovalEvent", ex);
        }
    }

    public void publishBookingCompleted(com.rideUp.booking_service.dto.event.BookingCompletedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(bookingCompletedTopic, event.getBookingId(), payload);
            log.info("Published BookingCompletedEvent eventId={}, bookingId={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getCorrelationId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize BookingCompletedEvent", ex);
        }
    }

    public void publishBookingApproved(com.rideUp.booking_service.dto.event.BookingApprovedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(bookingApprovedTopic, event.getBookingId(), payload);
            log.info("Published BookingApprovedEvent eventId={}, bookingId={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getCorrelationId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize BookingApprovedEvent", ex);
        }
    }

    public void publishBookingRejected(com.rideUp.booking_service.dto.event.BookingRejectedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(bookingRejectedTopic, event.getBookingId(), payload);
            log.info("Published BookingRejectedEvent eventId={}, bookingId={}, correlationId={}",
                    event.getEventId(), event.getBookingId(), event.getCorrelationId());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize BookingRejectedEvent", ex);
        }
    }
}
