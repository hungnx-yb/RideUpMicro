package com.rideup.trip_service.controller;

import com.rideup.trip_service.dto.request.CreateTripRequest;
import com.rideup.trip_service.dto.request.SeatReleaseRequest;
import com.rideup.trip_service.dto.request.SeatReserveRequest;
import com.rideup.trip_service.dto.request.TripStatusChangeRequest;
import com.rideup.trip_service.dto.response.ApiResponse;
import com.rideup.trip_service.dto.response.PageResponse;
import com.rideup.trip_service.dto.response.SeatUpdateResponse;
import com.rideup.trip_service.dto.response.TripResponse;
import com.rideup.trip_service.service.TripService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
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

        @PostMapping("/seats/reserve")
        public ApiResponse<SeatUpdateResponse> reserveSeats(
                                @Valid @RequestBody SeatReserveRequest request) {
        return ApiResponse.<SeatUpdateResponse>builder()
            .result(tripService.reserveSeats( request))
            .message("Seats reserved successfully")
            .build();
        }



        @PostMapping("/seats/release")
        public ApiResponse<SeatUpdateResponse> releaseSeats(@RequestBody SeatReleaseRequest request) {
        return ApiResponse.<SeatUpdateResponse>builder()
            .result(tripService.releaseSeats(request))
            .message("Seats released successfully")
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


    @GetMapping()
    public ApiResponse<List<TripResponse>> getAllTrips(@RequestParam String startWardId,
                                                       @RequestParam String endWardId,
                                                       @RequestParam(required = false) LocalDate date,
                                                       Pageable pageable
                                                       ){
        PageResponse<TripResponse> pageResponse = tripService.getAllTrips(startWardId, endWardId, date, pageable);
       return ApiResponse.<List<TripResponse>>builder()
               .result(pageResponse.getItems())
               .message("Trips retrieved successfully")
               .count(pageResponse.getMeta().getTotalElements())
               .build();
    }
}
