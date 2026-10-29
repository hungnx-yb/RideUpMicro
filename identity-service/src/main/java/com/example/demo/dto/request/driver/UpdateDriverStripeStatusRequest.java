package com.example.demo.dto.request.driver;

import com.example.demo.enums.StripeAccountStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateDriverStripeStatusRequest {
    String stripeAccountId;
    @NotNull(message = "Stripe account status is required")
    StripeAccountStatus stripeAccountStatus;
    Boolean stripePayoutsEnabled;
}
