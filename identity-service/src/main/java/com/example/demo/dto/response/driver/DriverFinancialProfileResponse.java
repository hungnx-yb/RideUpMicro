package com.example.demo.dto.response.driver;

import com.example.demo.enums.StripeAccountStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverFinancialProfileResponse {
    String driverId;
    String stripeAccountId;
    StripeAccountStatus stripeAccountStatus;
    Boolean stripePayoutsEnabled;
    BigDecimal systemDebt;
}
