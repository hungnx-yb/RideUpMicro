package com.rideup.trip_service.feignClient;
import com.rideup.trip_service.config.FeignClientConfig;
import com.rideup.trip_service.dto.response.ApiResponse;
import com.rideup.trip_service.dto.response.DriverResponse;
import com.rideup.trip_service.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.List;

@FeignClient(
        name = "identity-service",
        path = "api/identity",
        configuration = FeignClientConfig.class
)
public interface IdentityServiceClient {

    @GetMapping("/users/me")
    ApiResponse<UserResponse> getUserInfo();

    @PostMapping("/users")
    ApiResponse<List<UserResponse>> getUsersInfoByIds(@RequestBody List<String> userIds);

    @PostMapping("/drivers/detail")
    ApiResponse<List<DriverResponse>> getDriverDetail(@RequestBody List<String> userIds);
}
