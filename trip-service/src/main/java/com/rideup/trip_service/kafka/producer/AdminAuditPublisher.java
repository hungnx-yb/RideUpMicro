package com.rideup.trip_service.kafka.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.trip_service.dto.event.AdminAuditEvent;
import com.rideup.trip_service.utils.SecurityUtils;
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
 * ADM-FEAT-06: Gửi nhật ký kiểm toán về identity-service. Lỗi gửi không làm hỏng nghiệp vụ chính.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminAuditPublisher {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @NonFinal
    @Value("${app.kafka.topics.admin-audit-events:admin-audit-events}")
    String auditTopic;

    public void publish(String action, String targetType, String targetId, String description,
                        Object oldValue, Object newValue) {
        try {
            AdminAuditEvent event = AdminAuditEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .serviceName("trip-service")
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .actorId(SecurityUtils.getCurrentUserId())
                    .description(description)
                    .oldValue(oldValue == null ? null : objectMapper.writeValueAsString(oldValue))
                    .newValue(newValue == null ? null : objectMapper.writeValueAsString(newValue))
                    .occurredAt(LocalDateTime.now().toString())
                    .build();
            kafkaTemplate.send(auditTopic, targetId, objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            log.warn("[Audit] Failed to publish audit event action={} target={}: {}", action, targetId, e.getMessage());
        }
    }
}
