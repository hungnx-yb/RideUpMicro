package com.rideUp.payment_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverOnboardLinkResponse {
    String onboardUrl;
    String stripeAccountId;
    Long expiresAt;
}
