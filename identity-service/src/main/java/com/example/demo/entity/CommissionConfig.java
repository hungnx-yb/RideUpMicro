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

    // Mốc chuẩn & trọng số điều chỉnh theo Rating
    @Column(name = "rating_benchmark")
    @Builder.Default
    Double ratingBenchmark = 4.5;

    /** Bước nhảy hoa hồng theo mỗi 1 sao lệch chuẩn (0.02 = 2%/sao) */
    @Column(name = "rating_step", precision = 5, scale = 4)
    @Builder.Default
    BigDecimal ratingStep = new BigDecimal("0.0200");

    // Mốc chuẩn & trọng số điều chỉnh theo Điểm uy tín
    @Column(name = "reputation_benchmark")
    @Builder.Default
    Integer reputationBenchmark = 80;

    /** Bước nhảy hoa hồng theo mỗi 10 điểm uy tín lệch chuẩn (0.01 = 1%/10 điểm) */
    @Column(name = "reputation_step", precision = 5, scale = 4)
    @Builder.Default
    BigDecimal reputationStep = new BigDecimal("0.0100");

    /** Hạn mức nợ tiền mặt tối đa (VNĐ). Nợ >= hạn mức thì tài xế bị khóa nhận chuyến tiền mặt */
    @Column(name = "credit_limit", precision = 15, scale = 2)
    @Builder.Default
    BigDecimal creditLimit = new BigDecimal("500000");

    /** Ngưỡng điểm uy tín tối thiểu để được nhận chuyến */
    @Column(name = "min_accept_score")
    @Builder.Default
    Integer minAcceptScore = 50;

    @Column(name = "updated_by", length = 64)
    String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
