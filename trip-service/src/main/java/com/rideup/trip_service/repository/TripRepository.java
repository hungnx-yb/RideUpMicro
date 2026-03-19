package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TripRepository extends JpaRepository<Trip, String>, JpaSpecificationExecutor<Trip> {
}
