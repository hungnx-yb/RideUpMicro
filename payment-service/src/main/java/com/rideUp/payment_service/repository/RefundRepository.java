package com.rideUp.payment_service.repository;

import com.rideUp.payment_service.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefundRepository extends JpaRepository<Refund, String> {
    boolean existsByPayment_Id(String paymentId);
}
