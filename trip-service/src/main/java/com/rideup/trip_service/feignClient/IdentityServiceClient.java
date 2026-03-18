package com.rideup.trip_service.feignClient;
import com.rideup.trip_service.config.FeignClientConfig;
import com.rideup.trip_service.dto.response.ApiResponse;
import com.rideup.trip_service.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(
        name = "identity-service",
        path = "api/identity",
        configuration = FeignClientConfig.class
)
public interface IdentityServiceClient {

    @GetMapping("/users/me")
    ApiResponse<UserResponse> getUserInfo();
}
