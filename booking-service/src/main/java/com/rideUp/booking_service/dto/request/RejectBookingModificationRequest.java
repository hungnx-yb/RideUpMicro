package com.rideUp.booking_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RejectBookingModificationRequest {

    @NotBlank(message = "Lý do từ chối không được để trống")
    String reason;
}
