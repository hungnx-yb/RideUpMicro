package com.rideup.trip_service.entity;

import com.rideup.trip_service.enums.TripStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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

    private String id;

    private String routeId;

    private String driverId;
    private String vehicleId;

    private String startProvinceId;
    private String endProvinceId;


    private String startAddressText;
    private String endAddressText;

    private BigDecimal startLat;
    private BigDecimal startLng;
    private BigDecimal endLat;
    private BigDecimal endLng;

    private LocalDateTime departureTime;
    private LocalDateTime estimatedArrivalTime;

    private Integer seatTotal;
    private Integer seatAvailable;

    private BigDecimal priceVnd;

    @Enumerated(EnumType.STRING)
    private TripStatus status;

    @Version // 🔥 cực quan trọng
    private Integer version;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}