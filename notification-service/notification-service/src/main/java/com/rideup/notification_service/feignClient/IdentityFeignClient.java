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

    /** ADM-FEAT-04: Lọc người nhận phát sóng (yêu cầu token ADMIN được Feign chuyển tiếp) */
    @org.springframework.web.bind.annotation.PostMapping("/admin/broadcast-audience")
    ApiResponse<com.rideup.notification_service.dto.response.BroadcastAudienceResponse> resolveAudience(
            @org.springframework.web.bind.annotation.RequestBody com.rideup.notification_service.dto.request.BroadcastAudienceRequest request,
            @RequestParam("includeUserIds") boolean includeUserIds);

    @GetMapping("/drivers/internal/by-operating-provinces")
    ApiResponse<List<DriverResponse>> getDriversByOperatingProvinces(
            @RequestParam("startProvinceId") String startProvinceId,
            @RequestParam("endProvinceId") String endProvinceId
    );
}
