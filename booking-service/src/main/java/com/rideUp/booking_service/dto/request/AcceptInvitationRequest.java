package com.rideUp.booking_service.dto.request;

import com.rideUp.booking_service.enums.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AcceptInvitationRequest {

    @NotBlank(message = "Invitation ID is required")
    String invitationId;

    @NotNull(message = "Payment method is required")
    PaymentMethod paymentMethod;
}
