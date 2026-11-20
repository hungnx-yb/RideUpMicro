package com.rideUp.booking_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SystemTimeoutConfigResponse {
    String configKey;
    String displayName;
    Integer valueMinutes;
    Integer defaultMinutes;
    Integer minMinutes;
    Integer maxMinutes;
    String ownerService;
    String expireAction;
    String updatedBy;
    LocalDateTime updatedAt;
}
