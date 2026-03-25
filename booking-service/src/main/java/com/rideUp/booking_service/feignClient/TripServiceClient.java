package com.rideUp.booking_service.feignClient;

import com.rideUp.booking_service.config.FeignClientConfig;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.trip.TripSeatReleaseRequest;
import com.rideUp.booking_service.dto.trip.TripSeatReserveRequest;
import com.rideUp.booking_service.dto.trip.TripSeatUpdateResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "${clients.trip.name}",
        path = "${clients.trip.path}",
        configuration = FeignClientConfig.class
)
public interface TripServiceClient {

    @PostMapping("/seats/reserve")
    ApiResponse<TripSeatUpdateResponse> reserveSeats(@RequestBody TripSeatReserveRequest request);

    @PostMapping("/seats/release")
    ApiResponse<TripSeatUpdateResponse> releaseSeats(@RequestBody TripSeatReleaseRequest request);
}
