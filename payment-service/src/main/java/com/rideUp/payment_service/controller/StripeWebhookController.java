package com.rideUp.payment_service.controller;

import com.rideUp.payment_service.dto.response.ApiResponse;
import com.rideUp.payment_service.service.StripeConnectService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/payments/webhook/stripe")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StripeWebhookController {

    StripeConnectService stripeConnectService;

    @PostMapping
    public ApiResponse<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        log.info("[StripeWebhookController] Received Stripe webhook event");
        stripeConnectService.handleStripeWebhook(payload, sigHeader);
        return ApiResponse.<String>builder()
                .message("Webhook processed successfully")
                .result("OK")
                .build();
    }
}
