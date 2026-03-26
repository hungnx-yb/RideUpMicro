package com.rideUp.booking_service.entity;

import com.rideUp.booking_service.enums.BookingStatus;

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

    Integer seatCount;

    BigDecimal pricePerSeat;

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

    String note;

    LocalDateTime cancelledAt;
    String cancelReason;

    Integer tripVersionAtReserve;

    @Version
    Integer version;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column
    LocalDateTime updatedAt;
}
