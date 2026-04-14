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
import java.util.ArrayList;
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


    String driverId;
    String vehicleId;

    String startProvinceId;
    String endProvinceId;

    String startAddressText;
    String endAddressText;


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

    String note;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    List<TripStop> stops;


    public void addStop(TripStop stop) {
        if (stops == null) {
            stops = new ArrayList<>();
        }
        stops.add(stop);
        stop.setTrip(this);
    }
}
