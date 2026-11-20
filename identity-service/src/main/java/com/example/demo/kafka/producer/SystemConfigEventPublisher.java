package com.example.demo.kafka.producer;

import com.example.demo.dto.event.SystemConfigChangedEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bắn sự kiện thay đổi cấu hình hệ thống (topic system-config-events) để các service khác làm mới cache.
 * Không ném lỗi ra ngoài: nếu Kafka lỗi, các service vẫn tự làm mới theo TTL cache.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SystemConfigEventPublisher {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @NonFinal
    @Value("${app.kafka.topics.system-config-events:system-config-events}")
    String systemConfigTopic;

    public void publish(String configType, String changedBy, Object payload) {
        try {
            SystemConfigChangedEvent event = SystemConfigChangedEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .configType(configType)
                    .sourceService("identity-service")
                    .changedBy(changedBy)
                    .payload(objectMapper.writeValueAsString(payload))
                    .occurredAt(LocalDateTime.now().toString())
                    .build();
            kafkaTemplate.send(systemConfigTopic, configType, objectMapper.writeValueAsString(event));
            log.info("[Kafka] Published SystemConfigChangedEvent type={} to {}", configType, systemConfigTopic);
        } catch (Exception e) {
            log.warn("[Kafka] Failed to publish SystemConfigChangedEvent type={}: {}", configType, e.getMessage());
        }
    }
}
