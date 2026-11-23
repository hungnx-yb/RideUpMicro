package com.rideUp.booking_service.entity;

import com.rideUp.booking_service.enums.ModificationStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_modifications", indexes = {
        @Index(name = "idx_mod_booking_status", columnList = "bookingId, status"),
        @Index(name = "idx_mod_trip_status", columnList = "tripId, status"),
        @Index(name = "idx_mod_status_expires", columnList = "status, expiresAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingModification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(nullable = false)
    String bookingId;

    @Column(nullable = false)
    String customerId;

    @Column(nullable = false)
    String tripId;

    // Proposed new details
    String newPickupAddressText;
    String newPickupWardId;

    String newDropoffAddressText;
    String newDropoffWardId;

    String newPassengerName;
    String newPassengerPhone;

    @Column(columnDefinition = "TEXT")
    String newNote;

    // Old snapshot details (audit & before/after comparison)
    String oldPickupAddressText;
    String oldDropoffAddressText;
    String oldPassengerName;
    String oldPassengerPhone;

    @Column(columnDefinition = "TEXT")
    String oldNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    ModificationStatus status;

    String rejectionReason;

    @Column(nullable = false)
    LocalDateTime expiresAt;

    LocalDateTime resolvedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    LocalDateTime updatedAt;
}
