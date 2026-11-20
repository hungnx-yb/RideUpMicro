package com.example.demo.kafka.consumer;

import com.example.demo.dto.event.AdminAuditEvent;
import com.example.demo.service.AdminAuditLogService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

/**
 * ADM-FEAT-06: Nhận sự kiện kiểm toán từ booking-service, trip-service, notification-service...
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminAuditConsumer {

    AdminAuditLogService auditLogService;
    ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${app.kafka.topics.admin-audit-events:admin-audit-events}",
            groupId = "${spring.kafka.consumer.group-id}-audit"
    )
    public void consume(String payload, Acknowledgment ack) {
        try {
            AdminAuditEvent event = objectMapper.readValue(payload, AdminAuditEvent.class);
            auditLogService.saveFromEvent(event);
            log.info("[Kafka][Audit] Saved audit event {} from {} action={}",
                    event.getEventId(), event.getServiceName(), event.getAction());
        } catch (JsonProcessingException e) {
            log.error("[Kafka][Audit] Invalid audit payload, skipped: {}", payload, e);
        } catch (Exception e) {
            log.error("[Kafka][Audit] Failed to save audit event, skipped: {}", e.getMessage(), e);
        }
        // Nhật ký là dữ liệu phụ trợ: luôn ack để không chặn partition
        ack.acknowledge();
    }
}
