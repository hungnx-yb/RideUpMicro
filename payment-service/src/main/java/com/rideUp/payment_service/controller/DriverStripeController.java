package com.rideUp.payment_service.controller;

import com.rideUp.payment_service.dto.response.*;
import com.rideUp.payment_service.exception.AppException;
import com.rideUp.payment_service.exception.ErrorCode;
import com.rideUp.payment_service.feignClient.IdentityServiceClient;
import com.rideUp.payment_service.service.PayoutService;
import com.rideUp.payment_service.service.StripeConnectService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/payments/stripe/driver")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverStripeController {

    StripeConnectService stripeConnectService;
    PayoutService payoutService;
    IdentityServiceClient identityServiceClient;

    @PostMapping("/onboard-link")
    public ApiResponse<DriverOnboardLinkResponse> createOnboardLink(
            @RequestParam(value = "driverId", required = false) String driverId) {
        String resolvedDriverId = resolveDriverId(driverId);
        return ApiResponse.<DriverOnboardLinkResponse>builder()
                .message("Stripe onboard link created successfully")
                .result(stripeConnectService.createOnboardLink(resolvedDriverId))
                .build();
    }

    @GetMapping("/account-status")
    public ApiResponse<DriverAccountStatusResponse> getAccountStatus(
            @RequestParam(value = "driverId", required = false) String driverId) {
        String resolvedDriverId = resolveDriverId(driverId);
        return ApiResponse.<DriverAccountStatusResponse>builder()
                .message("Driver Stripe account status retrieved successfully")
                .result(stripeConnectService.getAccountStatus(resolvedDriverId))
                .build();
    }

    @PostMapping("/dashboard-link")
    public ApiResponse<DriverDashboardLinkResponse> createDashboardLink(
            @RequestParam(value = "driverId", required = false) String driverId) {
        String resolvedDriverId = resolveDriverId(driverId);
        return ApiResponse.<DriverDashboardLinkResponse>builder()
                .message("Stripe Express dashboard login link created successfully")
                .result(stripeConnectService.createDashboardLink(resolvedDriverId))
                .build();
    }

    @GetMapping("/payouts")
    public ApiResponse<List<DriverPayoutResponse>> getDriverPayouts(
            @RequestParam(value = "driverId", required = false) String driverId) {
        String resolvedDriverId = resolveDriverId(driverId);
        return ApiResponse.<List<DriverPayoutResponse>>builder()
                .message("Driver payouts retrieved successfully")
                .result(payoutService.getDriverPayouts(resolvedDriverId))
                .build();
    }

    private String resolveDriverId(String driverId) {
        if (driverId != null && !driverId.isBlank()) {
            return driverId;
        }
        try {
            ApiResponse<UserResponse> userResponse = identityServiceClient.getUserInfo();
            if (userResponse != null && userResponse.getResult() != null && userResponse.getResult().getId() != null) {
                return userResponse.getResult().getId();
            }
        } catch (Exception e) {
            log.warn("Could not resolve current user from identityServiceClient: {}", e.getMessage());
        }
        throw new AppException(ErrorCode.UNAUTHENTICATED);
    }
}
