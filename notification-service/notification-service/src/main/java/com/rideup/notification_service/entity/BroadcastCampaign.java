package com.rideup.notification_service.entity;

import com.rideup.notification_service.enums.BroadcastStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * ADM-FEAT-04: Chiến dịch phát sóng thông báo thủ công đa kênh.
 */
@Entity
@Table(name = "broadcast_campaigns", indexes = {
        @Index(name = "idx_broadcast_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BroadcastCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(nullable = false, length = 200)
    String title;

    /** Tóm tắt hiển thị trên thanh thông báo (<= 200 ký tự) */
    @Column(nullable = false, length = 200)
    String summary;

    /** Nội dung chi tiết (Markdown) hiển thị trong app */
    @Lob
    @Column(columnDefinition = "TEXT")
    String content;

    @Column(name = "deep_link", length = 255)
    String deepLink;

    /** ALL | DRIVER | CUSTOMER | DIRECT (gửi trực tiếp danh sách userId) */
    @Column(name = "target_role", length = 16, nullable = false)
    String targetRole;

    /** Danh sách mã tỉnh, phân tách bằng dấu phẩy */
    @Column(name = "province_ids", columnDefinition = "TEXT")
    String provinceIds;

    @Column(name = "min_reputation")
    Integer minReputation;

    @Column(name = "max_reputation")
    Integer maxReputation;

    /** Danh sách kênh, phân tách bằng dấu phẩy: IN_APP, WEBSOCKET, FCM */
    @Column(name = "channels", length = 100, nullable = false)
    String channels;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    BroadcastStatus status;

    @Column(name = "total_recipients")
    Integer totalRecipients;

    @Column(name = "total_delivered")
    Integer totalDelivered;

    /** Ghi chú kết quả theo kênh (vd: FCM chưa cấu hình) */
    @Column(name = "delivery_note", length = 500)
    String deliveryNote;

    @Column(name = "created_by", length = 64)
    String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @Column(name = "sent_at")
    LocalDateTime sentAt;
}
