package com.rideup.trip_service.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.trip_service.dto.event.*;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceEventProducer {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @NonFinal
    @Value("${app.kafka.topics.marketplace-invitation-accepted:marketplace-invitation-accepted}")
    String topicMarketplaceAccepted;

    @NonFinal
    @Value("${app.kafka.topics.trip-request-created:trip-request-created}")
    String topicTripRequestCreated;

    @NonFinal
    @Value("${app.kafka.topics.trip-request-invited:trip-request-invited}")
    String topicTripRequestInvited;

    @NonFinal
    @Value("${app.kafka.topics.trip-request-invitation-rejected:trip-request-invitation-rejected}")
    String topicTripRequestRejected;

    @NonFinal
    @Value("${app.kafka.topics.trip-request-expired:trip-request-expired}")
    String topicTripRequestExpired;

    @NonFinal
    @Value("${app.kafka.topics.trip-request-cancelled:trip-request-cancelled}")
    String topicTripRequestCancelled;

    public void publishInvitationAcceptedEvent(InvitationAcceptedEvent event) {
        publishEvent(topicMarketplaceAccepted, event.getTripRequestId(), event);
    }

    public void publishTripRequestCreatedEvent(TripRequestCreatedEvent event) {
        publishEvent(topicTripRequestCreated, event.getTripRequestId(), event);
    }

    public void publishTripRequestInvitedEvent(TripRequestInvitedEvent event) {
        publishEvent(topicTripRequestInvited, event.getTripRequestId(), event);
    }

    public void publishInvitationRejectedEvent(InvitationRejectedEvent event) {
        publishEvent(topicTripRequestRejected, event.getTripRequestId(), event);
    }

    public void publishTripRequestExpiredEvent(TripRequestCancelEvent event) {
        publishEvent(topicTripRequestExpired, event.getPassengerId(), event);
    }

    public void publishTripRequestCancelledEvent(TripRequestCancelEvent event ) {
        publishEvent(topicTripRequestCancelled, event.getPassengerId(), event);
    }

    private void publishEvent(String topic, String key, Object payload) {
        try {
            String message = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(topic, key, message);
            log.info("Published Kafka event to {}: {}", topic, message);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize Kafka event payload for topic {}", topic, e);
        }
    }
}
