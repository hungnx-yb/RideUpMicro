package com.rideUp.booking_service.repository;

import com.rideUp.booking_service.entity.Booking;
import com.rideUp.booking_service.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, String> {

    Optional<Booking> findByBookingCode(String bookingCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") String id);

    List<Booking> findByCustomerIdOrderByCreatedAtDesc(String customerId);

    List<Booking> findByTripIdOrderByCreatedAtDesc(String tripId);

    List<Booking> findByStatusAndExpiresAtBefore(BookingStatus status, LocalDateTime now);

    List<Booking> findByStatusInAndExpiresAtBefore(List<BookingStatus> statuses, LocalDateTime now);

    List<Booking> findByTripIdAndStatusIn(String tripId, List<BookingStatus> statuses);

    boolean existsByCustomerIdAndTripIdAndStatusIn(String customerId, String tripId, List<BookingStatus> activeStatuses);

    // ===== ADM-FEAT-02: Thống kê doanh thu =====
    /** Vé hoàn thành trong kỳ. Dữ liệu cũ chưa có completedAt thì dùng updatedAt. */
    @org.springframework.data.jpa.repository.Query("""
            SELECT b FROM Booking b
            WHERE b.status = com.rideUp.booking_service.enums.BookingStatus.COMPLETED
              AND COALESCE(b.completedAt, b.updatedAt) >= :from
              AND COALESCE(b.completedAt, b.updatedAt) < :to
            ORDER BY COALESCE(b.completedAt, b.updatedAt) DESC
            """)
    List<Booking> findCompletedBetween(@org.springframework.data.repository.query.Param("from") LocalDateTime from,
                                       @org.springframework.data.repository.query.Param("to") LocalDateTime to);

    long countByStatusInAndCancelledAtGreaterThanEqualAndCancelledAtLessThan(
            List<BookingStatus> statuses, LocalDateTime from, LocalDateTime to);
}
