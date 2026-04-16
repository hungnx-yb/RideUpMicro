package com.rideUp.booking_service.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideUp.booking_service.dto.event.PaymentCompletedEvent;
import com.rideUp.booking_service.dto.event.PaymentFailedEvent;
import com.rideUp.booking_service.dto.event.RefundCompletedEvent;
import com.rideUp.booking_service.dto.request.PaymentCompletedRequest;
import com.rideUp.booking_service.dto.request.PaymentFailedRequest;
import com.rideUp.booking_service.dto.request.RefundCompletedRequest;
import com.rideUp.booking_service.service.BookingService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingServiceConsumer {

    BookingService bookingService;
    ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${app.kafka.topics.payment-completed}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onPaymentCompleted(String payload, Acknowledgment ack) throws Exception {
        PaymentCompletedEvent event = objectMapper.readValue(payload, PaymentCompletedEvent.class);
        log.info("[PaymentCompletedEvent] eventId={}, bookingId={}, paymentId={}, correlationId={}",
                event.getEventId(), event.getBookingId(), event.getPaymentId(), event.getCorrelationId());

        bookingService.handlePaymentCompleted(
                PaymentCompletedRequest.builder()
                        .bookingId(event.getBookingId())
                        .paymentId(event.getPaymentId())
                        .correlationId(event.getCorrelationId())
                        .build()
        );
                ack.acknowledge();
    }

    @KafkaListener(
            topics = "${app.kafka.topics.payment-failed}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onPaymentFailed(String payload, Acknowledgment ack) throws Exception {
        PaymentFailedEvent event = objectMapper.readValue(payload, PaymentFailedEvent.class);
        log.info("[PaymentFailedEvent] eventId={}, bookingId={}, paymentId={}, correlationId={}",
                event.getEventId(), event.getBookingId(), event.getPaymentId(), event.getCorrelationId());

        bookingService.handlePaymentFailed(
                PaymentFailedRequest.builder()
                        .bookingId(event.getBookingId())
                        .paymentId(event.getPaymentId())
                        .reason(event.getReason())
                        .correlationId(event.getCorrelationId())
                        .build()
        );
                ack.acknowledge();
    }

}
