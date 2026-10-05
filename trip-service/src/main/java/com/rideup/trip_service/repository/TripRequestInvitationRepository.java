package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.TripRequestInvitation;
import com.rideup.trip_service.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TripRequestInvitationRepository extends JpaRepository<TripRequestInvitation, String> {
    boolean existsByTripRequestIdAndTripId(String tripRequestId, String tripId);
    List<TripRequestInvitation> findByTripRequestIdAndStatus(String tripRequestId, InvitationStatus status);
    List<TripRequestInvitation> findByDriverIdAndStatus(String driverId, InvitationStatus status);
    long countByTripRequestIdAndStatus(String tripRequestId, InvitationStatus status);
}
