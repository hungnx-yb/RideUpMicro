package com.example.demo.dto.response.admin;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BroadcastAudienceResponse {
    long totalRecipients;
    /** Danh sách userId (chỉ trả về khi includeUserIds = true) */
    List<String> userIds;
}
