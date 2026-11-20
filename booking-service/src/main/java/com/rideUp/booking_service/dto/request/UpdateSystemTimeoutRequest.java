package com.rideUp.booking_service.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateSystemTimeoutRequest {
    /** Chỉ dùng khi cập nhật hàng loạt */
    String configKey;

    @NotNull(message = "valueMinutes is required")
    Integer valueMinutes;
}
