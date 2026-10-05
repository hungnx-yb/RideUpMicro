package com.rideup.trip_service.kafka;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceEventProducer {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    private static final String TOPIC_MARKETPLACE_ACCEPTED = "marketplace-invitation-accepted";
    private static final String TOPIC_TRIP_REQUEST_CREATED = "trip-request-created";
    private static final String TOPIC_TRIP_REQUEST_INVITED = "trip-request-invited";
    private static final String TOPIC_TRIP_REQUEST_REJECTED = "trip-request-invitation-rejected";
    private static final String TOPIC_TRIP_REQUEST_EXPIRED = "trip-request-expired";
    private static final String TOPIC_TRIP_REQUEST_CANCELLED = "trip-request-cancelled";

    public void publishInvitationAcceptedEvent(String tripRequestId, String driverId, String passengerId, String invitationId) {
        publishEvent(TOPIC_MARKETPLACE_ACCEPTED, tripRequestId, Map.of(
                "tripRequestId", tripRequestId,
                "driverId", driverId,
                "passengerId", passengerId,
                "invitationId", invitationId
        ));
    }

    public void publishTripRequestCreatedEvent(String tripRequestId, String passengerId, String startProvinceId, String endProvinceId, Integer seatTotal, java.time.LocalDateTime departureTime) {
        publishEvent(TOPIC_TRIP_REQUEST_CREATED, tripRequestId, Map.of(
                "tripRequestId", tripRequestId,
                "passengerId", passengerId,
                "startProvinceId", startProvinceId,
                "endProvinceId", endProvinceId,
                "seatTotal", String.valueOf(seatTotal),
                "departureTime", departureTime.toString()
        ));
    }

    public void publishTripRequestInvitedEvent(String invitationId, String tripRequestId, String driverId, String passengerId, String tripId) {
        publishEvent(TOPIC_TRIP_REQUEST_INVITED, tripRequestId, Map.of(
                "invitationId", invitationId,
                "tripRequestId", tripRequestId,
                "driverId", driverId,
                "passengerId", passengerId,
                "tripId", tripId
        ));
    }

    public void publishInvitationRejectedEvent(String invitationId, String tripRequestId, String driverId, String passengerId) {
        publishEvent(TOPIC_TRIP_REQUEST_REJECTED, tripRequestId, Map.of(
                "invitationId", invitationId,
                "tripRequestId", tripRequestId,
                "driverId", driverId,
                "passengerId", passengerId
        ));
    }

    public void publishTripRequestExpiredEvent(String tripRequestId, String passengerId) {
        publishEvent(TOPIC_TRIP_REQUEST_EXPIRED, tripRequestId, Map.of(
                "tripRequestId", tripRequestId,
                "passengerId", passengerId
        ));
    }

    public void publishTripRequestCancelledEvent(String tripRequestId, String passengerId) {
        publishEvent(TOPIC_TRIP_REQUEST_CANCELLED, tripRequestId, Map.of(
                "tripRequestId", tripRequestId,
                "passengerId", passengerId
        ));
    }

    private void publishEvent(String topic, String key, Map<String, String> payload) {
        try {
            String message = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(topic, key, message);
            log.info("Published Kafka event to {}: {}", topic, message);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize Kafka event payload for topic {}", topic, e);
        }
    }
}
