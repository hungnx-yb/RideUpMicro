package com.rideup.review_service.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.review_service.dto.event.DriverRatingUpdatedEvent;
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
public class ReviewServicePublisher {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @NonFinal
    @Value("${app.kafka.topics.driver-rating-updated}")
    String driverRatingUpdatedTopic;

    public void publishDriverRatingUpdated(DriverRatingUpdatedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(driverRatingUpdatedTopic, event.getDriverId(), payload);
            log.info("Published DriverRatingUpdatedEvent for driverId={}, averageRating={}",
                    event.getDriverId(), event.getAverageRating());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize DriverRatingUpdatedEvent", ex);
        }
    }
}
