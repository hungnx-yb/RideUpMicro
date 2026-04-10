package com.rideUp.booking_service.controller;

import com.rideUp.booking_service.dto.request.CancelBookingRequest;
import com.rideUp.booking_service.dto.request.CreateBookingRequest;
import com.rideUp.booking_service.dto.request.PaymentCompletedRequest;
import com.rideUp.booking_service.dto.request.PaymentFailedRequest;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.response.BookingResponse;
import com.rideUp.booking_service.service.BookingService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingController {

    BookingService bookingService;

    @PostMapping
    public ApiResponse<BookingResponse> createBooking(@Valid @RequestBody CreateBookingRequest request) {
        return ApiResponse.<BookingResponse>builder()
                .message("Booking created successfully")
                .result(bookingService.createBooking(request))
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<BookingResponse> getBookingDetail(@PathVariable String id) {
        return ApiResponse.<BookingResponse>builder()
                .message("Booking retrieved successfully")
                .result(bookingService.getBookingDetail(id))
                .build();
    }

    @GetMapping("/my-bookings")
    public ApiResponse<List<BookingResponse>> getMyBookings() {
        List<BookingResponse> responses = bookingService.getMyBookings();
        return ApiResponse.<List<BookingResponse>>builder()
                .message("Bookings retrieved successfully")
                .count((long) responses.size())
                .result(responses)
                .build();
    }

    @GetMapping("/trip/{tripId}")
    public ApiResponse<List<BookingResponse>> getBookingsByTripId(@PathVariable String tripId) {
        List<BookingResponse> responses = bookingService.getBookingsByTripId(tripId);
        return ApiResponse.<List<BookingResponse>>builder()
                .message("Bookings retrieved successfully")
                .count((long) responses.size())
                .result(responses)
                .build();
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<BookingResponse> cancelBooking(
            @PathVariable String id,
            @RequestBody(required = false) @Valid CancelBookingRequest request
    ) {
        return ApiResponse.<BookingResponse>builder()
                .message("Booking cancelled successfully")
                .result(bookingService.cancelBooking(id, request))
                .build();
    }

    @PostMapping("/internal/payments/completed")
    public ApiResponse<BookingResponse> handlePaymentCompleted(@Valid @RequestBody PaymentCompletedRequest request) {
        return ApiResponse.<BookingResponse>builder()
                .message("Booking confirmed from payment callback")
                .result(bookingService.handlePaymentCompleted(request))
                .build();
    }

    @PostMapping("/internal/payments/failed")
    public ApiResponse<BookingResponse> handlePaymentFailed(@Valid @RequestBody PaymentFailedRequest request) {
        return ApiResponse.<BookingResponse>builder()
                .message("Booking cancelled from payment callback")
                .result(bookingService.handlePaymentFailed(request))
                .build();
    }
}
