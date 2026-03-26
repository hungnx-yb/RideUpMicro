package com.rideUp.booking_service.feignClient;

import com.rideUp.booking_service.config.FeignClientConfig;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.request.SeatReleaseRequest;
import com.rideUp.booking_service.dto.request.SeatReserveRequest;
import com.rideUp.booking_service.dto.request.SeatResponse;
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
    ApiResponse<SeatResponse> reserveSeats(@RequestBody SeatReserveRequest request);

    @PostMapping("/seats/release")
    ApiResponse<SeatResponse> releaseSeats(@RequestBody SeatReleaseRequest request);
}
