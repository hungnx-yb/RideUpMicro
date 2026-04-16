package com.rideup.trip_service.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.trip_service.dto.event.BookingCancelledEvent;
import com.rideup.trip_service.dto.request.SeatReleaseRequest;
import com.rideup.trip_service.service.TripService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripServiceConsumer {

    TripService tripService;
    ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${app.kafka.topics.booking-cancelled}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    @Transactional
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

}
