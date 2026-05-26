package com.example.demo.kafka.consumer;

import com.example.demo.entity.User;
import com.example.demo.exception.AppException;
import com.example.demo.exception.ErrorCode;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.demo.dto.event.DriverRatingUpdatedEvent;
import com.example.demo.entity.DriverProfile;
import com.example.demo.repository.DriverProfileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
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
public class IdentityServiceConsumer {

    DriverProfileRepository driverProfileRepository;
    ObjectMapper objectMapper;
    UserRepository userRepository;

    @RetryableTopic(
            exclude = {JsonProcessingException.class, IllegalArgumentException.class}
    )
    @Transactional
    @KafkaListener(
            topics = "${app.kafka.topics.driver-rating-updated}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void consumeDriverRatingUpdated(String payload, Acknowledgment ack) {
        log.info("[Kafka] Received DriverRatingUpdatedEvent: {}", payload);
        try {
            DriverRatingUpdatedEvent event = objectMapper.readValue(payload, DriverRatingUpdatedEvent.class);
            User user = userRepository.findById(event.getDriverId()).orElseThrow(()->new AppException(ErrorCode.USER_NOT_EXISTED));
            DriverProfile driverProfile = user.getDriverProfile() ;

            if (driverProfile != null) {
                driverProfile.setDriverRating(event.getAverageRating());
                driverProfileRepository.save(driverProfile);
                log.info("[Kafka] Updated driver rating to {} for driverId: {}",
                        event.getAverageRating(), event.getDriverId());
            } else {
                log.warn("[Kafka] DriverProfile not found for driverId: {}. Skipping.", event.getDriverId());
            }

            ack.acknowledge();

        } catch (JsonProcessingException e) {
            log.error("[Kafka][POISON-PILL] Cannot deserialize, sending to DLT. payload={}", payload, e);
            throw new IllegalArgumentException("Poison pill detected", e);
        } catch (Exception e) {
            log.error("[Kafka] Transient error, will retry via RetryableTopic.", e);
            throw e;
        }
    }

    @DltHandler
    public void handleDlt(String payload, Exception ex) {
        log.error("[DLT] Message permanently failed after all retries. " +
                "MANUAL INTERVENTION REQUIRED! payload={}, error={}", payload, ex.getMessage());
    }
}
