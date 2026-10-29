package com.rideUp.payment_service.repository;

import com.rideUp.payment_service.entity.DriverPayoutTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverPayoutTransactionRepository extends JpaRepository<DriverPayoutTransaction, String> {
    Optional<DriverPayoutTransaction> findByBookingId(String bookingId);
    List<DriverPayoutTransaction> findByDriverIdOrderByCreatedAtDesc(String driverId);
}
