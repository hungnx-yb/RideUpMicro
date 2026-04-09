package com.rideup.notification_service.entity;
import com.rideup.notification_service.enums.NotificationStatus;
import com.rideup.notification_service.enums.NotificationType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
@Entity
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "user_id", nullable = false)
    String userId;

    @Column(nullable = false, length = 200)
    String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    NotificationStatus status;

    @Column(columnDefinition = "TEXT")
    String metadata;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @Column(name = "read_at")
    LocalDateTime readAt;
}