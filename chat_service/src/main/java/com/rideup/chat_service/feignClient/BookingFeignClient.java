package com.rideup.chat_service.feignClient;

import com.rideup.chat_service.config.FeignClientConfig;
import com.rideup.chat_service.dto.response.ApiResponse;
import com.rideup.chat_service.dto.response.BookingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "booking-service",
        path = "/api/booking",
        configuration = FeignClientConfig.class)
public interface BookingFeignClient {

    @GetMapping("/bookings/{id}")
    ApiResponse<BookingResponse> getBookingById(@PathVariable("id") String bookingId);
}
