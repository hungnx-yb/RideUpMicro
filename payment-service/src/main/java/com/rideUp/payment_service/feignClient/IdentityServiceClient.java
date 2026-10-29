package com.rideUp.payment_service.feignClient;

import com.rideUp.payment_service.config.FeignClientConfig;
import com.rideUp.payment_service.dto.request.UpdateDriverStripeStatusRequest;
import com.rideUp.payment_service.dto.response.ApiResponse;
import com.rideUp.payment_service.dto.response.DriverCommissionRateResponse;
import com.rideUp.payment_service.dto.response.DriverFinancialProfileResponse;
import com.rideUp.payment_service.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@FeignClient(
        name = "identity-service",
        path = "/api/identity",
        configuration = FeignClientConfig.class
)
public interface IdentityServiceClient {

    @GetMapping("/drivers/me/wallet")
    ApiResponse<BigDecimal> getMyWallet();

    @GetMapping("/users/me")
    ApiResponse<UserResponse> getUserInfo();

    @PostMapping("/drivers/internal/{driverId}/add-debt")
    ApiResponse<Void> addDebtInternal(@PathVariable("driverId") String driverId, @RequestParam("amount") BigDecimal amount);

    @GetMapping("/drivers/internal/{driverId}/financial-profile")
    ApiResponse<DriverFinancialProfileResponse> getDriverFinancialProfile(@PathVariable("driverId") String driverId);

    @PutMapping("/drivers/internal/{driverId}/stripe-status")
    ApiResponse<Void> updateDriverStripeStatus(@PathVariable("driverId") String driverId, @RequestBody UpdateDriverStripeStatusRequest request);

    @PostMapping("/drivers/internal/{driverId}/deduct-debt")
    ApiResponse<Void> deductDebtInternal(@PathVariable("driverId") String driverId, @RequestParam("amount") BigDecimal amount);

    @GetMapping("/drivers/internal/{driverId}/commission-rate")
    ApiResponse<DriverCommissionRateResponse> getCommissionRateInternal(@PathVariable("driverId") String driverId);
}
