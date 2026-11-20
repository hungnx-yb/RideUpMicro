package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * ADM-FEAT-06: Nhật ký kiểm toán hành động quản trị.
 * Lưu snapshot JSON trước/sau mỗi lần Admin thay đổi tham số hệ thống (ở mọi microservice).
 */
@Entity
@Table(name = "admin_audit_logs", indexes = {
        @Index(name = "idx_audit_created_at", columnList = "created_at"),
        @Index(name = "idx_audit_service_action", columnList = "service_name, action")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    /** Event id từ Kafka để chống ghi trùng khi consumer retry */
    @Column(name = "event_id", length = 64, unique = true)
    String eventId;

    @Column(name = "service_name", length = 64, nullable = false)
    String serviceName;

    /** Mã hành động, ví dụ: UPDATE_COMMISSION_CONFIG, APPROVE_DRIVER, SEND_BROADCAST */
    @Column(name = "action", length = 64, nullable = false)
    String action;

    @Column(name = "target_type", length = 64)
    String targetType;

    @Column(name = "target_id", length = 128)
    String targetId;

    @Column(name = "actor_id", length = 64)
    String actorId;

    @Column(name = "actor_email", length = 255)
    String actorEmail;

    @Column(name = "description", length = 500)
    String description;

    @Lob
    @Column(name = "old_value", columnDefinition = "TEXT")
    String oldValue;

    @Lob
    @Column(name = "new_value", columnDefinition = "TEXT")
    String newValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;
}
