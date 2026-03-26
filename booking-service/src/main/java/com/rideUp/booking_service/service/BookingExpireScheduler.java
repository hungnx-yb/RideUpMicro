package com.rideUp.booking_service.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingExpireScheduler {

    BookingService bookingService;

//    @Scheduled(fixedDelayString = "${booking.expire.fixed-delay-ms:30000}")
    public void expirePendingBookings() {
        int expiredCount = bookingService.expirePendingBookings();
        if (expiredCount > 0) {
            log.info("Expired {} pending bookings due to payment timeout", expiredCount);
        }
    }
}
