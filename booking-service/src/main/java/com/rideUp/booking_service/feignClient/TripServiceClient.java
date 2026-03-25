package com.rideUp.booking_service.feignClient;

import com.rideUp.booking_service.config.FeignClientConfig;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.request.TripSeatReleaseRequest;
import com.rideUp.booking_service.dto.request.TripSeatReserveRequest;
import com.rideUp.booking_service.dto.request.TripSeatUpdateResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "trip-service",
        path = "/api/trip/trip",
        configuration = FeignClientConfig.class
)
public interface TripServiceClient {

    @PostMapping("/seats/reserve")
    ApiResponse<TripSeatUpdateResponse> reserveSeats(@RequestBody TripSeatReserveRequest request);

    @PostMapping("/seats/release")
    ApiResponse<TripSeatUpdateResponse> releaseSeats(@RequestBody TripSeatReleaseRequest request);
}
