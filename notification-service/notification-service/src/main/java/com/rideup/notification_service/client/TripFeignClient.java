package com.rideup.notification_service.client;

import com.rideup.notification_service.dto.response.ApiResponse;
import com.rideup.notification_service.dto.response.TripResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "trip-service", url = "${app.clients.trip.base-url:http://localhost:8083/api/trip}")
public interface TripFeignClient {

    @GetMapping("/{id}")
    ApiResponse<TripResponse> getTripById(@PathVariable("id") String tripId);
}
