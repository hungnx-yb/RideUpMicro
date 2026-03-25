package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;

public interface BookingEventPublisher {

    void publishPaymentRequested(PaymentRequestedEvent event);
}
