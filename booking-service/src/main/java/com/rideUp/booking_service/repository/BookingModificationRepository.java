package com.rideUp.booking_service.repository;

import com.rideUp.booking_service.entity.BookingModification;
import com.rideUp.booking_service.enums.ModificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingModificationRepository extends JpaRepository<BookingModification, String> {

    boolean existsByBookingIdAndStatus(String bookingId, ModificationStatus status);

    long countByBookingIdAndStatus(String bookingId, ModificationStatus status);

    List<BookingModification> findByBookingIdOrderByCreatedAtDesc(String bookingId);

    List<BookingModification> findByTripIdAndStatus(String tripId, ModificationStatus status);

    List<BookingModification> findByTripIdInAndStatus(List<String> tripIds, ModificationStatus status);

    List<BookingModification> findByStatusAndExpiresAtLessThanEqual(ModificationStatus status, LocalDateTime expiresAt);
}
