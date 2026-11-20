package com.rideup.notification_service.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/** Tiêu chí lọc người nhận, gửi sang identity-service */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BroadcastAudienceRequest {
    String targetRole;
    List<String> provinceIds;
    Integer minReputation;
    Integer maxReputation;
}
