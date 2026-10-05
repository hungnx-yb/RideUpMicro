package com.rideup.trip_service.kafka.consumer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.trip_service.dto.event.BookingCancelledEvent;
import com.rideup.trip_service.dto.request.SeatReleaseRequest;
import com.rideup.trip_service.service.TripService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripServiceConsumer {

    TripService tripService;
    com.rideup.trip_service.service.TripRequestService tripRequestService;
    ObjectMapper objectMapper;

    @RetryableTopic(exclude = {JsonProcessingException.class})
    @Transactional
    @KafkaListener(
            topics = "${app.kafka.topics.booking-cancelled}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onBookingCancelled(String payload, Acknowledgment ack) throws Exception {
        BookingCancelledEvent event = objectMapper.readValue(payload, BookingCancelledEvent.class);
        log.info("[BookingCancelledEvent] eventId={}, bookingId={}, tripId={}, correlationId={}",
                event.getEventId(), event.getBookingId(), event.getTripId(), event.getCorrelationId());
        tripService.releaseSeats(
                SeatReleaseRequest.builder()
                        .tripId(event.getTripId())
                        .seatCount(event.getSeatCount())
                        .build()
        );
        ack.acknowledge();
    }

    @RetryableTopic(exclude = {JsonProcessingException.class})
    @Transactional
    @KafkaListener(
            topics = "${app.kafka.topics.booking-confirmed}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onBookingConfirmed(String payload, Acknowledgment ack) throws Exception {
        com.rideup.trip_service.dto.event.BookingConfirmedEvent event = objectMapper.readValue(payload, com.rideup.trip_service.dto.event.BookingConfirmedEvent.class);
        log.info("[BookingConfirmedEvent] eventId={}, bookingId={}, customerId={}, tripId={}, correlationId={}",
                event.getEventId(), event.getBookingId(), event.getCustomerId(), event.getTripId(), event.getCorrelationId());
        
        if (event.getCustomerId() != null) {
            tripRequestService.cancelAllOpenRequests(event.getCustomerId(), "Auto-cancelled due to confirmed booking");
        }
        
        ack.acknowledge();
    }

    @DltHandler
    public void handleDlt(ConsumerRecord<String, String> record, Exception ex) {
        log.error("[DLT][trip-service] Message permanently failed after all retries. " +
                        "MANUAL INTERVENTION REQUIRED! topic={}, offset={}, payload={}, error={}",
                record.topic(), record.offset(), record.value(), ex.getMessage());
    }
}
