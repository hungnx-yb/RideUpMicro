package com.example.demo.kafka.consumer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.demo.dto.event.DriverRatingUpdatedEvent;
import com.example.demo.entity.DriverProfile;
import com.example.demo.repository.DriverProfileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class IdentityServiceConsumer {

    DriverProfileRepository driverProfileRepository;
    ObjectMapper objectMapper;
    @RetryableTopic(
            exclude = {JsonProcessingException.class}
    )
    @Transactional
    @KafkaListener(
            topics = "${app.kafka.topics.driver-rating-updated}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeDriverRatingUpdated(ConsumerRecord<String, String> record, Acknowledgment ack) {
        String payload = record.value();
        log.info("[Kafka] Received DriverRatingUpdatedEvent | topic={}, partition={}, offset={}, payload={}",
                record.topic(), record.partition(), record.offset(), payload);
        try {
            DriverRatingUpdatedEvent event = objectMapper.readValue(payload, DriverRatingUpdatedEvent.class);

            DriverProfile driverProfile = driverProfileRepository.findById(event.getDriverId()).orElse(null);

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
            throw new RuntimeException("Poison pill detected", e);
        } catch (Exception e) {
            log.error("[Kafka] Transient error, will retry via RetryableTopic. offset={}", record.offset(), e);
            throw e;
        }
    }


    @DltHandler
    public void handleDlt(ConsumerRecord<String, String> record, Exception ex) {
        log.error("[DLT] Message permanently failed after all retries. " +
                        "MANUAL INTERVENTION REQUIRED! topic={}, partition={}, offset={}, payload={}, error={}",
                record.topic(), record.partition(), record.offset(), record.value(), ex.getMessage());
        // TODO: Gửi alert lên Slack/PagerDuty hoặc lưu vào bảng "dead_letter_events" trong DB
    }
}
