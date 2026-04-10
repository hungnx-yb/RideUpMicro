package com.rideup.notification_service.dto.response;

import com.rideup.notification_service.enums.NotificationStatus;
import com.rideup.notification_service.enums.NotificationType;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationResponse {
    String id;
    String userId;
    String title;
    String message;
    NotificationType type;
    NotificationStatus status;
    String metadata;
    LocalDateTime createdAt;
    LocalDateTime readAt;
}
