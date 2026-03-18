package com.rideup.trip_service.feignClient;

import com.rideup.trip_service.config.FeignClientConfig;
import com.rideup.trip_service.dto.response.ApiResponse;
import com.rideup.trip_service.dto.response.ProvinceResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "location-service",
        path = "api/location",
        configuration = FeignClientConfig.class
)
public interface LocationServiceClient {

    @GetMapping("/province/{id}")
    ApiResponse<ProvinceResponse> getProvinceById(@PathVariable("id") String id);
}
