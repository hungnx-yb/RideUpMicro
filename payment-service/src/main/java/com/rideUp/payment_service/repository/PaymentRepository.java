package com.rideUp.payment_service.repository;

import com.rideUp.payment_service.entity.Payment;
import com.rideUp.payment_service.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByBookingId(String bookingId);

    List<Payment> findAllByStatusAndExpiredAtBefore(PaymentStatus status, LocalDateTime time);

}
