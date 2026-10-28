package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "commission_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommissionConfig {

    @Id
    @Builder.Default
    String id = "DEFAULT";

    @Column(name = "base_rate", precision = 5, scale = 4, nullable = false)
    @Builder.Default
    BigDecimal baseRate = new BigDecimal("0.1800");

    @Column(name = "min_rate", precision = 5, scale = 4, nullable = false)
    @Builder.Default
    BigDecimal minRate = new BigDecimal("0.1200");

    @Column(name = "max_rate", precision = 5, scale = 4, nullable = false)
    @Builder.Default
    BigDecimal maxRate = new BigDecimal("0.2500");

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
