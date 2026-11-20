package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.FareBoundaryConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FareBoundaryConfigRepository extends JpaRepository<FareBoundaryConfig, String> {
}
