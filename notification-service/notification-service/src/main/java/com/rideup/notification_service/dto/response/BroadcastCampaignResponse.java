package com.rideup.notification_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BroadcastCampaignResponse {
    String id;
    String title;
    String summary;
    String content;
    String deepLink;
    String targetRole;
    List<String> provinceIds;
    Integer minReputation;
    Integer maxReputation;
    List<String> channels;
    String status;
    Integer totalRecipients;
    Integer totalDelivered;
    String deliveryNote;
    String createdBy;
    LocalDateTime createdAt;
    LocalDateTime sentAt;
}
