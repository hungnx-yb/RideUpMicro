package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.TripRequest;
import com.rideup.trip_service.enums.TripRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripRequestRepository extends JpaRepository<TripRequest, String>, TripRequestRepositoryCustom {
            
    List<TripRequest> findByPassengerIdOrderByCreatedAtDesc(String passengerId);

    List<TripRequest> findByPassengerIdAndStatusOrderByCreatedAtDesc(String passengerId, TripRequestStatus status);

    List<TripRequest> findByPassengerIdAndStatus(String passengerId, TripRequestStatus status);

    Page<TripRequest> findByStatusAndExpiresAtLessThanEqual(TripRequestStatus status, java.time.LocalDateTime time, Pageable pageable);
    
    boolean existsByPassengerIdAndStartProvinceIdAndEndProvinceIdAndDepartureTimeAndStatus(
            String passengerId, String startProvinceId, String endProvinceId, java.time.LocalDateTime departureTime, TripRequestStatus status);
}
