package com.rideup.trip_service.repository;


import com.rideup.trip_service.entity.Trip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

public interface TripRepositoryCustom {
    public Page<Trip> getAllTrips(String startWardId, String endWardId, LocalDate date, Pageable pageable);
}
