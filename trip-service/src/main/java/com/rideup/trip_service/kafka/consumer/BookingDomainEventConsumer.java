package com.rideup.trip_service.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.trip_service.dto.event.BookingCancelledEvent;
import com.rideup.trip_service.dto.event.BookingConfirmedEvent;
import com.rideup.trip_service.entity.ProcessedKafkaEvent;
import com.rideup.trip_service.dto.request.SeatReleaseRequest;
import com.rideup.trip_service.repository.ProcessedKafkaEventRepository;
import com.rideup.trip_service.service.TripService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingDomainEventConsumer {

    TripService tripService;
    ObjectMapper objectMapper;
        ProcessedKafkaEventRepository processedKafkaEventRepository;

    @KafkaListener(
            topics = "${app.kafka.topics.booking-confirmed}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
        @Transactional
    public void onBookingConfirmed(String payload) throws Exception {
        BookingConfirmedEvent event = objectMapper.readValue(payload, BookingConfirmedEvent.class);

                if (!markEventProcessed(event.getEventId(), "BOOKING_CONFIRMED", event.getCorrelationId())) {
                        return;
                }

        log.info("[BookingConfirmedEvent] eventId={}, bookingId={}, tripId={}, correlationId={}",
                event.getEventId(), event.getBookingId(), event.getTripId(), event.getCorrelationId());

        tripService.handleBookingConfirmed(event.getTripId(), event.getSeatCount(), event.getBookingId(), event.getCorrelationId());
    }

    @KafkaListener(
            topics = "${app.kafka.topics.booking-cancelled}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
        @Transactional
    public void onBookingCancelled(String payload) throws Exception {
        BookingCancelledEvent event = objectMapper.readValue(payload, BookingCancelledEvent.class);

                if (!markEventProcessed(event.getEventId(), "BOOKING_CANCELLED", event.getCorrelationId())) {
                        return;
                }

        log.info("[BookingCancelledEvent] eventId={}, bookingId={}, tripId={}, correlationId={}",
                event.getEventId(), event.getBookingId(), event.getTripId(), event.getCorrelationId());

        tripService.releaseSeats(
                SeatReleaseRequest.builder()
                        .tripId(event.getTripId())
                        .seatCount(event.getSeatCount())
                        .build()
        );
    }

        private boolean markEventProcessed(String eventId, String eventType, String correlationId) {
                if (eventId == null || eventId.isBlank()) {
                        log.warn("Incoming event without eventId for type={}, correlationId={}", eventType, correlationId);
                        return true;
                }

                try {
                        processedKafkaEventRepository.save(
                                        ProcessedKafkaEvent.builder()
                                                        .eventId(eventId)
                                                        .eventType(eventType)
                                                        .correlationId(correlationId)
                                                        .build()
                        );
                        return true;
                } catch (DataIntegrityViolationException ex) {
                        log.info("Skip duplicated event eventId={}, eventType={}, correlationId={}",
                                        eventId, eventType, correlationId);
                        return false;
                }
        }
}
