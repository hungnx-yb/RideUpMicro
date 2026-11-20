package com.example.demo.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

/** Sự kiện thông báo một nhóm cấu hình hệ thống vừa thay đổi (topic system-config-events) */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SystemConfigChangedEvent {
    String eventId;
    /** COMMISSION_CONFIG | SYSTEM_TIMEOUTS | FARE_BOUNDARY */
    String configType;
    String sourceService;
    String changedBy;
    String payload;
    String occurredAt;
}
