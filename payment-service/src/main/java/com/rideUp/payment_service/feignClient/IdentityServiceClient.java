package com.rideUp.payment_service.feignClient;

import com.rideUp.payment_service.config.FeignClientConfig;
import com.rideUp.payment_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(
        name = "identity-service",
        path = "/api/identity",
        configuration = FeignClientConfig.class
)
public interface IdentityServiceClient {

    @GetMapping("/drivers/me/wallet")
    ApiResponse<java.math.BigDecimal> getMyWallet();

    @GetMapping("/users/me")
    ApiResponse<com.rideUp.payment_service.dto.response.UserResponse> getUserInfo();

    @PostMapping("/drivers/internal/{driverId}/add-debt")
    ApiResponse<Void> addDebtInternal(@PathVariable("driverId") String driverId, @RequestParam("amount") java.math.BigDecimal amount);
}
