package com.rideUp.booking_service.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

/** ADM-FEAT-06: Sự kiện kiểm toán gửi về identity-service (topic admin-audit-events) */
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
