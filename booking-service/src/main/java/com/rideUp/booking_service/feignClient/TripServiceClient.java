package com.rideUp.booking_service.feignClient;

import com.rideUp.booking_service.config.FeignClientConfig;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.request.SeatReleaseRequest;
import com.rideUp.booking_service.dto.request.SeatReserveRequest;
import com.rideUp.booking_service.dto.request.SeatResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "trip-service",
        path = "/api/trip",
        configuration = FeignClientConfig.class
)
public interface TripServiceClient {

    @PostMapping("/trip/seats/reserve")
    ApiResponse<SeatResponse> reserveSeats(@RequestBody SeatReserveRequest request);

    @PostMapping("/trip/seats/release")
    ApiResponse<SeatResponse> releaseSeats(@RequestBody SeatReleaseRequest request);

    @GetMapping("/trip/{id}")
    ApiResponse<com.rideUp.booking_service.dto.response.TripResponse> getTripById(@org.springframework.web.bind.annotation.PathVariable("id") String id);

    @PostMapping("/trip-requests/invitations/{invitationId}/internal-accept")
    ApiResponse<Void> acceptInvitation(@org.springframework.web.bind.annotation.PathVariable("invitationId") String invitationId);

    @GetMapping("/trip-requests/invitations/{invitationId}")
    ApiResponse<com.rideUp.booking_service.dto.response.TripRequestInvitationResponse> getInvitation(@org.springframework.web.bind.annotation.PathVariable("invitationId") String invitationId);
}
