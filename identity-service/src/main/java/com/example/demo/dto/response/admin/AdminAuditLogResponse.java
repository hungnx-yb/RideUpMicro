package com.example.demo.dto.response.admin;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AdminAuditLogResponse {
    String id;
    String serviceName;
    String action;
    String targetType;
    String targetId;
    String actorId;
    String actorEmail;
    String description;
    String oldValue;
    String newValue;
    LocalDateTime createdAt;
}
