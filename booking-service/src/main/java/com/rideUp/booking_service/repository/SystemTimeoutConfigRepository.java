package com.rideUp.booking_service.repository;

import com.rideUp.booking_service.entity.SystemTimeoutConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemTimeoutConfigRepository extends JpaRepository<SystemTimeoutConfig, String> {
}
