package com.example.demo.kafka.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Bắn sự kiện kết quả duyệt phương tiện để notification-service báo cho tài xế.
 * Gửi SAU KHI transaction commit: nếu lưu DB thất bại thì tài xế không nhận thông báo sai.
 * Không ném lỗi ra ngoài: Kafka lỗi chỉ mất thông báo, không làm hỏng thao tác duyệt của admin.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VehicleReviewEventPublisher {

    KafkaTemplate<String, String> kafkaTemplate;
    ObjectMapper objectMapper;

    @NonFinal
    @Value("${app.kafka.topics.vehicle-rejected:vehicle.rejected}")
    String vehicleRejectedTopic;

    /**
     * @param driverUserId id tài khoản (User) của tài xế = userId dùng để lưu thông báo
     */
    public void publishVehicleRejected(String driverUserId, String vehicleId, String plateNumber, String reason) {
        if (driverUserId == null || driverUserId.isBlank()) {
            log.warn("[Kafka] Skip vehicle-rejected event: vehicle {} has no driver user", vehicleId);
            return;
        }
        Map<String, String> event = new HashMap<>();
        event.put("driverUserId", driverUserId);
        event.put("vehicleId", vehicleId);
        event.put("plateNumber", plateNumber != null ? plateNumber : "");
        event.put("reason", reason != null ? reason : "");
        event.put("rejectedAt", LocalDateTime.now().toString());

        runAfterCommit(() -> send(vehicleRejectedTopic, driverUserId, event));
    }

    private void send(String topic, String key, Map<String, String> event) {
        try {
            kafkaTemplate.send(topic, key, objectMapper.writeValueAsString(event));
            log.info("[Kafka] Published {} for user {}", topic, key);
        } catch (Exception e) {
            log.warn("[Kafka] Failed to publish {} for user {}: {}", topic, key, e.getMessage());
        }
    }

    private static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
