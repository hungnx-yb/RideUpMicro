package com.example.demo.dto.response.driver;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommissionConfigResponse implements Serializable {
    BigDecimal baseRate;
    BigDecimal minRate;
    BigDecimal maxRate;
    Double ratingBenchmark;
    BigDecimal ratingStep;
    Integer reputationBenchmark;
    BigDecimal reputationStep;
    BigDecimal creditLimit;
    Integer minAcceptScore;
    String updatedBy;
    /** Họ tên của admin cập nhật lần cuối */
    String updatedByName;
    /** ISO-8601, lưu dạng chuỗi để cache Redis an toàn */
    String updatedAt;
}
