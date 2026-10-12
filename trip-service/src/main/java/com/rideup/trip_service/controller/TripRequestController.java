package com.rideup.trip_service.controller;

import com.rideup.trip_service.dto.request.MarketplaceTripRequestFilter;
import com.rideup.trip_service.dto.request.TripRequestCreate;
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
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/trip-requests")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripRequestController {

    TripRequestService tripRequestService;


    @PostMapping
    public ApiResponse<TripRequestResponse> createTripRequest(@Valid @RequestBody TripRequestCreate request) {
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

    @PostMapping("/invitations/{invitationId}/validate-and-reserve")
    public ApiResponse<com.rideup.trip_service.dto.response.ProcessMarketplaceBookingResponse> validateAndReserve(
            @PathVariable String invitationId, 
            @RequestParam String passengerId) {
        return ApiResponse.<com.rideup.trip_service.dto.response.ProcessMarketplaceBookingResponse>builder()
                .message("Invitation validated and seats reserved successfully.")
                .result(tripRequestService.validateAndReserveSeats(invitationId, passengerId))
                .build();
    }

    @PostMapping("/invitations/{invitationId}/internal-accept")
    public ApiResponse<Void> internalAcceptInvitation(@PathVariable String invitationId) {
        tripRequestService.markInvitationAccepted(invitationId);
        return ApiResponse.<Void>builder()
                .message("Invitation accepted. Booking created by booking-service.")
                .build();
    }

    // ----- DRIVER APIs -----

    @GetMapping("/marketplace")
    public ApiResponse<Page<TripRequestResponse>> getMarketplace(
            @Valid @ModelAttribute MarketplaceTripRequestFilter filter,
            Pageable pageable) {
        return ApiResponse.<Page<TripRequestResponse>>builder()
                .result(tripRequestService.getOpenRequestsInMarketplace(filter, pageable))
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
