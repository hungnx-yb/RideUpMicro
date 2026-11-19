package com.rideUp.payment_service.dto.request;

import com.rideUp.payment_service.enums.StripeAccountStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateDriverStripeStatusRequest {
    String stripeAccountId;
    StripeAccountStatus stripeAccountStatus;
    Boolean stripePayoutsEnabled;
}
