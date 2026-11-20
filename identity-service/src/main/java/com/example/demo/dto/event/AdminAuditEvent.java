package com.example.demo.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Sự kiện kiểm toán do các microservice khác bắn vào topic admin-audit-events.
 * oldValue/newValue là chuỗi JSON snapshot.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AdminAuditEvent {
    String eventId;
    String serviceName;
    String action;
    String targetType;
    String targetId;
    String actorId;
    String description;
    String oldValue;
    String newValue;
    String occurredAt;
}
