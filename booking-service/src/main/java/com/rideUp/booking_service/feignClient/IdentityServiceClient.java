package com.rideUp.booking_service.feignClient;

import com.rideUp.booking_service.config.FeignClientConfig;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(
        name = "identity-service",
        path = "/api/identity",
        configuration = FeignClientConfig.class
)
public interface IdentityServiceClient {

    @PostMapping("/users")
    ApiResponse<List<UserResponse>> getUsersInfoByIds(@RequestBody List<String> userIds);

    @org.springframework.web.bind.annotation.GetMapping("/drivers/me/eligibility")
    ApiResponse<com.rideUp.booking_service.dto.response.DriverEligibilityResponse> getMyEligibility();

    @org.springframework.web.bind.annotation.GetMapping("/admin/finance/summary")
    ApiResponse<com.rideUp.booking_service.dto.response.FinanceSummaryResponse> getFinanceSummary(
            @org.springframework.web.bind.annotation.RequestParam("fromDate") String fromDate,
            @org.springframework.web.bind.annotation.RequestParam("toDate") String toDate,
            @org.springframework.web.bind.annotation.RequestParam("paymentMethod") String paymentMethod);

    @org.springframework.web.bind.annotation.GetMapping("/admin/finance/driver-debts")
    ApiResponse<List<com.rideUp.booking_service.dto.response.DriverDebtResponse>> getDriverDebts(
            @org.springframework.web.bind.annotation.RequestParam("status") String status);

    @org.springframework.web.bind.annotation.GetMapping("/drivers/me/wallet")
    ApiResponse<java.math.BigDecimal> getMyWallet();

    @org.springframework.web.bind.annotation.GetMapping("/drivers/internal/{driverId}/financial-profile")
    ApiResponse<com.rideUp.booking_service.dto.response.DriverFinancialProfileResponse> getDriverFinancialProfile(@org.springframework.web.bind.annotation.PathVariable("driverId") String driverId);
}
