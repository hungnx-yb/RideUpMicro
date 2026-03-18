package com.rideup.trip_service.entity;

import com.rideup.trip_service.enums.TripStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    // 🔥 BẮT BUỘC có route
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "route_id", nullable = false)
    Route route;

    String driverId;
    String vehicleId;

    String startProvinceId;
    String endProvinceId;

    String startAddressText;
    String endAddressText;

    BigDecimal startLat;
    BigDecimal startLng;
    BigDecimal endLat;
    BigDecimal endLng;

    LocalDateTime departureTime;
    LocalDateTime estimatedArrivalTime;

    Integer seatTotal;
    Integer seatAvailable;

    BigDecimal priceVnd;

    @Enumerated(EnumType.STRING)
    TripStatus status;

    @Version
    Integer version;

    @CreationTimestamp
    LocalDateTime createdAt;

    @UpdateTimestamp
    LocalDateTime updatedAt;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    List<TripStop> stops;
}
