package com.example.demo.dto.request.admin;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * ADM-FEAT-04: Tiêu chí lọc người nhận thông báo phát sóng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BroadcastAudienceRequest {
    /** ALL | DRIVER | CUSTOMER */
    String targetRole;
    /** Chỉ áp dụng khi targetRole = DRIVER: tài xế hoạt động ở ít nhất một tỉnh trong danh sách */
    List<String> provinceIds;
    /** Chỉ áp dụng khi targetRole = DRIVER */
    Integer minReputation;
    Integer maxReputation;
}
