package com.rideUp.booking_service.entity;

import com.rideUp.booking_service.enums.BookingStatus;
import com.rideUp.booking_service.enums.PaymentMethod;
import com.rideUp.booking_service.enums.PaymentStatus;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(unique = true, nullable = false)
    String bookingCode;

    String customerId;

    String tripId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    BookingStatus status;

    String paymentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    PaymentStatus paymentStatus;

    Integer seatCount;

    BigDecimal totalAmount;

    LocalDateTime reservedAt;
    LocalDateTime expiresAt;


    String pickupWardId;
    Double pickupLat;
    Double pickupLng;
    String pickupAddressText;

    String dropoffWardId;
    Double dropoffLat;
    Double dropoffLng;
    String dropoffAddressText;

    String passengerName;
    String passengerPhone;

    String note;

    LocalDateTime cancelledAt;
    String cancelReason;

    /** ADM-FEAT-02: thời điểm hoàn thành chuyến (phục vụ thống kê doanh thu theo kỳ) */
    @Column(name = "completed_at")
    LocalDateTime completedAt;

    @Version
    Integer version;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column
    LocalDateTime updatedAt;
}
