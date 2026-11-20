package com.rideup.trip_service.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ADM-FEAT-05: Khung giá cước tham chiếu theo km (đơn giá cho 1 ghế).
 */
@Entity
@Table(name = "fare_boundary_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FareBoundaryConfig {

    @Id
    @Builder.Default
    String id = "DEFAULT";

    /** Giá sàn mỗi km mỗi ghế (VNĐ) */
    @Column(name = "min_price_per_km", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    BigDecimal minPricePerKm = new BigDecimal("1200");

    /** Giá trần mỗi km mỗi ghế (VNĐ) */
    @Column(name = "max_price_per_km", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    BigDecimal maxPricePerKm = new BigDecimal("4000");

    /**
     * Hệ số quy đổi khoảng cách đường chim bay giữa 2 tỉnh sang quãng đường đường bộ thực tế
     * (đường bộ thường dài hơn 20-40%).
     */
    @Column(name = "road_factor", precision = 4, scale = 2, nullable = false)
    @Builder.Default
    BigDecimal roadFactor = new BigDecimal("1.30");

    /** Tắt kiểm tra (vd: mùa cao điểm Tết) mà không cần xóa cấu hình */
    @Column(name = "enabled", nullable = false)
    @Builder.Default
    Boolean enabled = true;

    @Column(name = "updated_by", length = 64)
    String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
