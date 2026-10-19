package com.rideup.trip_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripRequestInvitationCreateDTO {
    @NotBlank(message = "Trip request ID is required")
    String tripRequestId;

    @NotBlank(message = "Trip ID is required")
    String tripId;

    String message;
}
