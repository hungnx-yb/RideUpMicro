package com.rideup.chat_service.feignClient;

import com.rideup.chat_service.config.FeignClientConfig;
import com.rideup.chat_service.dto.response.ApiResponse;
import com.rideup.chat_service.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "identity-service",
        path = "/api/identity",
        configuration = FeignClientConfig.class)
public interface IdentityServiceClient {

    @PostMapping("/users")
    ApiResponse<List<UserResponse>> getUsersInfoByIds(@RequestBody List<String> userIds);
}
