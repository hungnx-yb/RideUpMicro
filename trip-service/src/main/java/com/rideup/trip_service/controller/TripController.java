package com.rideup.trip_service.controller;

import com.rideup.trip_service.dto.request.CreateTripRequest;
import com.rideup.trip_service.dto.request.TripStatusChangeRequest;
import com.rideup.trip_service.dto.request.UpdateTripRequest;
import com.rideup.trip_service.dto.response.ApiResponse;
import com.rideup.trip_service.dto.response.PageResponse;
import com.rideup.trip_service.dto.response.TripResponse;
import com.rideup.trip_service.service.TripService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/trip")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripController {

    TripService tripService;

    @PostMapping
    public ApiResponse<TripResponse> createTrip(@Valid @RequestBody CreateTripRequest request) {
        return ApiResponse.<TripResponse>builder()
                .result(tripService.createTrip(request))
                .message("Trip created successfully")
                .build();
    }



    @PatchMapping("/{id}/status")
    public ApiResponse<TripResponse> changeStatus(@PathVariable String id,
                                                  @Valid @RequestBody TripStatusChangeRequest request) {
        return ApiResponse.<TripResponse>builder()
                .result(tripService.changeStatus(id, request))
                .message("Trip status updated")
                .build();
    }


    @GetMapping("/{id}")
    public ApiResponse<TripResponse> getTripDetail(@PathVariable String id) {
        return ApiResponse.<TripResponse>builder()
                .result(tripService.getDetail(id))
                .message("Trip retrieved successfully")
                .build();
    }
}
