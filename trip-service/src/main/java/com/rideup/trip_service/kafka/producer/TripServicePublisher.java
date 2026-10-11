package com.rideup.trip_service.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.trip_service.dto.event.TripCancelledEvent;
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
public class TripServicePublisher {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @NonFinal
    @Value("${app.kafka.topics.trip-cancelled:trip.cancelled}")
    String tripCancelledTopic;

    public void publishTripCancelled(TripCancelledEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(tripCancelledTopic, event.getTripId(), payload);
            log.info("Published TripCancelledEvent eventId={}, tripId={}, driverId={}, reason={}",
                    event.getEventId(), event.getTripId(), event.getDriverId(), event.getCancelReason());
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize TripCancelledEvent for tripId={}", event.getTripId(), ex);
            throw new IllegalStateException("Failed to serialize TripCancelledEvent", ex);
        }
    }
}
