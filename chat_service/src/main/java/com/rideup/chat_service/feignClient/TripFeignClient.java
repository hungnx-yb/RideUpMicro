package com.rideup.chat_service.feignClient;

import com.rideup.chat_service.config.FeignClientConfig;
import com.rideup.chat_service.dto.response.ApiResponse;
import com.rideup.chat_service.dto.response.TripResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "trip-service",
        path = "/api/trip/trip",
        configuration = FeignClientConfig.class)
public interface TripFeignClient {

    @GetMapping("/{id}")
    ApiResponse<TripResponse> getTripById(@PathVariable("id") String tripId);
}
