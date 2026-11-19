package com.rideUp.payment_service.dto.response;

import com.rideUp.payment_service.enums.StripeAccountStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverAccountStatusResponse {
    String driverId;
    String stripeAccountId;
    StripeAccountStatus status;
    Boolean payoutsEnabled;
    Boolean detailsSubmitted;
    BigDecimal currentDebt;
}
