package com.rideUp.booking_service.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * ADM-FEAT-03: Bảng lưu tập trung các tham số timeout vận hành.
 * booking-service là service sở hữu bảng; giá trị được đồng bộ sang Redis hash config:system_timeouts
 * để trip-service cùng đọc.
 */
@Entity
@Table(name = "system_timeout_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SystemTimeoutConfig {

    @Id
    @Column(name = "config_key", length = 64)
    String configKey;

    @Column(name = "value_minutes", nullable = false)
    Integer valueMinutes;

    @Column(name = "updated_by", length = 64)
    String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
