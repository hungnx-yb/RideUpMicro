package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class LoggingBookingEventPublisher implements BookingEventPublisher {

    @Override
    public void publishPaymentRequested(PaymentRequestedEvent event) {
        log.info("[PaymentRequestedEvent] eventId={}, bookingId={}, paymentMethod={}",
                event.getEventId(),
                event.getBookingId(),
                event.getPaymentMethod());
    }
}
