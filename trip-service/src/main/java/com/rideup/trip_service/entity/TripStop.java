package com.rideup.trip_service.entity;

import com.rideup.trip_service.enums.StopType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripStop {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    private StopType stopType;

    private String wardId;

    private String addressText;

    private BigDecimal lat;

    private BigDecimal lng;

    private BigDecimal extraFeeVnd;

    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    Trip trip;

}