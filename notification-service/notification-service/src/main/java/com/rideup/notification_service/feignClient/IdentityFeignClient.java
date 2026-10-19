package com.rideup.notification_service.feignClient;

import com.rideup.notification_service.config.FeignClientConfig;
import com.rideup.notification_service.dto.response.ApiResponse;
import com.rideup.notification_service.dto.response.DriverResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(
        name = "identity-service",
        path = "/api/identity",
        configuration = FeignClientConfig.class
)
public interface IdentityFeignClient {

    @GetMapping("/drivers/internal/by-operating-provinces")
    ApiResponse<List<DriverResponse>> getDriversByOperatingProvinces(
            @RequestParam("startProvinceId") String startProvinceId,
            @RequestParam("endProvinceId") String endProvinceId
    );
}
