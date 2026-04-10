package com.rideup.notification_service.client;

import com.rideup.notification_service.dto.response.ApiResponse;
import com.rideup.notification_service.dto.response.BookingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "booking-service", url = "${app.clients.booking.base-url:http://localhost:8084/api/booking}")
public interface BookingFeignClient {

    @GetMapping("/bookings/{id}")
    ApiResponse<BookingResponse> getBookingById(@PathVariable("id") String bookingId);
}
