package com.rideup.trip_service.entity;

import com.rideup.trip_service.enums.TripRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "trip_request", indexes = {
        @Index(name = "idx_marketplace", columnList = "startProvinceId, endProvinceId, status, departureTime"),
        @Index(name = "idx_expire", columnList = "status, expiresAt"),
        @Index(name = "idx_customer", columnList = "passengerId, status")
})
public class TripRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String passengerId;

    String startProvinceId;
    String startWardId;
    String endProvinceId;
    String endWardId;

    String startAddressText;
    String endAddressText;

    LocalDateTime departureTime;

    Integer seatTotal;

    @Enumerated(EnumType.STRING)
    TripRequestStatus status;

    LocalDateTime expiresAt;
    LocalDateTime cancelledAt;
    String cancelReason;

    @Version
    Integer version;

    @CreationTimestamp
    LocalDateTime createdAt;

    @UpdateTimestamp
    LocalDateTime updatedAt;

    String note;

    @OneToMany(mappedBy = "tripRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    List<TripRequestInvitation> invitations;

    public void addInvitation(TripRequestInvitation invitation) {
        if (invitations == null) {
            invitations = new ArrayList<>();
        }
        invitations.add(invitation);
        invitation.setTripRequest(this);
    }
}
