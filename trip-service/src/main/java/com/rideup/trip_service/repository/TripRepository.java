package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import com.rideup.trip_service.enums.TripStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, String>, TripRepositoryCustom {

    List<Trip> findByStatusInAndDepartureTimeLessThanEqual(List<TripStatus> statuses, LocalDateTime cutoff);

    @Query("SELECT t FROM Trip t WHERE t.status = com.rideup.trip_service.enums.TripStatus.STARTED AND " +
           "((t.estimatedArrivalTime IS NOT NULL AND t.estimatedArrivalTime <= :cutoff) OR " +
           "(t.estimatedArrivalTime IS NULL AND t.departureTime <= :departureCutoff))")
    List<Trip> findStartedTripsToComplete(@Param("cutoff") LocalDateTime cutoff,
                                         @Param("departureCutoff") LocalDateTime departureCutoff);
}
