package com.rideup.trip_service.entity;

import com.rideup.trip_service.enums.InvitationStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "trip_request_invitation", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"trip_request_id", "trip_id"})
})
public class TripRequestInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_request_id", nullable = false)
    TripRequest tripRequest;

    @Column(name = "driver_id", nullable = false)
    String driverId;

    String tripId;

    String message;

    @Enumerated(EnumType.STRING)
    InvitationStatus status;

    LocalDateTime respondedAt;

    @CreationTimestamp
    LocalDateTime createdAt;

    @UpdateTimestamp
    LocalDateTime updatedAt;
}
