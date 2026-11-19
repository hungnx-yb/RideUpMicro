package com.rideup.locationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "location_distance_configs", indexes = {
        @Index(name = "idx_loc_dist_province_active", columnList = "province_id, is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LocationDistanceConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    /**
     * Mã Tỉnh/TP áp dụng. NULL = Cấu hình toàn hệ thống (Global Default)
     */
    @Column(name = "province_id", length = 50, unique = true)
    String provinceId;

    /**
     * Bán kính đón/trả tối đa (km) cho phép ghim điểm (VD: 10km Hà Nội, 35km Lào Cai, 20km mặc định)
     */
    @Column(name = "max_distance_km", nullable = false)
    Double maxDistanceKm;

    @Column(name = "description", length = 255)
    String description;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}

