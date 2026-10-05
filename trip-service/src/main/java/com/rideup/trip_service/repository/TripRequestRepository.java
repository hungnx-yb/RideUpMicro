package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.TripRequest;
import com.rideup.trip_service.enums.TripRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripRequestRepository extends JpaRepository<TripRequest, String> {
    @org.springframework.data.jpa.repository.Query("SELECT t FROM TripRequest t WHERE t.status = :status AND t.expiresAt > CURRENT_TIMESTAMP " +
            "AND t.startProvinceId = :startProvinceId AND t.endProvinceId = :endProvinceId " +
            "AND (:startWardId IS NULL OR t.startWardId = :startWardId) " +
            "AND (:endWardId IS NULL OR t.endWardId = :endWardId) " +
            "AND (:fromTime IS NULL OR t.departureTime >= :fromTime) " +
            "AND (:toTime IS NULL OR t.departureTime <= :toTime) " +
            "AND (:minSeat IS NULL OR t.seatTotal >= :minSeat)")
    Page<TripRequest> getMarketplaceRequests(
            @org.springframework.data.repository.query.Param("startProvinceId") String startProvinceId,
            @org.springframework.data.repository.query.Param("endProvinceId") String endProvinceId,
            @org.springframework.data.repository.query.Param("startWardId") String startWardId,
            @org.springframework.data.repository.query.Param("endWardId") String endWardId,
            @org.springframework.data.repository.query.Param("fromTime") java.time.LocalDateTime fromTime,
            @org.springframework.data.repository.query.Param("toTime") java.time.LocalDateTime toTime,
            @org.springframework.data.repository.query.Param("minSeat") Integer minSeat,
            @org.springframework.data.repository.query.Param("status") TripRequestStatus status,
            Pageable pageable);
            
    List<TripRequest> findByPassengerIdAndStatus(String passengerId, TripRequestStatus status);

    Page<TripRequest> findByStatusAndExpiresAtLessThanEqual(TripRequestStatus status, java.time.LocalDateTime time, Pageable pageable);
    
    boolean existsByPassengerIdAndStartProvinceIdAndEndProvinceIdAndDepartureTimeAndStatus(
            String passengerId, String startProvinceId, String endProvinceId, java.time.LocalDateTime departureTime, TripRequestStatus status);
}
