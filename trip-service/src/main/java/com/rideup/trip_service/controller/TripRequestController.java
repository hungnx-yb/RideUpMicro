package com.rideup.trip_service.controller;

import com.rideup.trip_service.dto.request.TripRequestCreateDTO;
import com.rideup.trip_service.dto.request.TripRequestInvitationCreateDTO;
import com.rideup.trip_service.dto.response.ApiResponse;
import com.rideup.trip_service.dto.response.TripRequestInvitationResponse;
import com.rideup.trip_service.dto.response.TripRequestResponse;
import com.rideup.trip_service.service.TripRequestService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/trip-requests")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripRequestController {

    TripRequestService tripRequestService;

    // ----- PASSENGER APIs -----

    @PostMapping
    public ApiResponse<TripRequestResponse> createTripRequest(@Valid @RequestBody TripRequestCreateDTO request) {
        return ApiResponse.<TripRequestResponse>builder()
                .result(tripRequestService.createTripRequest(request))
                .message("Trip request created successfully")
                .build();
    }

    @GetMapping("/me")
    public ApiResponse<List<TripRequestResponse>> getMyTripRequests() {
        return ApiResponse.<List<TripRequestResponse>>builder()
                .result(tripRequestService.getMyTripRequests())
                .message("Your trip requests retrieved successfully")
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> cancelTripRequest(@PathVariable String id) {
        tripRequestService.cancelTripRequest(id);
        return ApiResponse.<Void>builder()
                .message("Trip request cancelled successfully")
                .build();
    }

    @PostMapping("/invitations/{invitationId}/reject")
    public ApiResponse<Void> rejectInvitation(@PathVariable String invitationId) {
        tripRequestService.rejectInvitation(invitationId);
        return ApiResponse.<Void>builder()
                .message("Invitation rejected successfully")
                .build();
    }

    @GetMapping("/invitations/{invitationId}")
    public ApiResponse<TripRequestInvitationResponse> getInvitation(@PathVariable String invitationId) {
        return ApiResponse.<TripRequestInvitationResponse>builder()
                .result(tripRequestService.getInvitation(invitationId))
                .message("Invitation retrieved successfully")
                .build();
    }

    @PostMapping("/invitations/{invitationId}/internal-accept")
    public ApiResponse<Void> internalAcceptInvitation(@PathVariable String invitationId) {
        tripRequestService.acceptInvitation(invitationId);
        return ApiResponse.<Void>builder()
                .message("Invitation accepted successfully. Booking is being processed.")
                .build();
    }

    // ----- DRIVER APIs -----

    @GetMapping("/marketplace")
    public ApiResponse<Page<TripRequestResponse>> getMarketplace(
            @RequestParam String startProvinceId,
            @RequestParam String endProvinceId,
            @RequestParam(required = false) String startWardId,
            @RequestParam(required = false) String endWardId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime fromTime,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime toTime,
            @RequestParam(required = false) Integer minSeat,
            Pageable pageable) {
        return ApiResponse.<Page<TripRequestResponse>>builder()
                .result(tripRequestService.getOpenRequestsInMarketplace(startProvinceId, endProvinceId, startWardId, endWardId, fromTime, toTime, minSeat, pageable))
                .message("Marketplace requests retrieved successfully")
                .build();
    }

    @PostMapping("/invitations")
    public ApiResponse<TripRequestInvitationResponse> sendInvitation(@Valid @RequestBody TripRequestInvitationCreateDTO request) {
        return ApiResponse.<TripRequestInvitationResponse>builder()
                .result(tripRequestService.sendInvitation(request))
                .message("Invitation sent successfully")
                .build();
    }
}
