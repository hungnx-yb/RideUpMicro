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

    private String tripId;

    @Enumerated(EnumType.STRING)
    private StopType stopType;

    private Integer sequenceNo;

    private String wardId;

    private String addressText;

    private BigDecimal lat;
    private BigDecimal lng;

    private LocalDateTime plannedTime;

    private BigDecimal extraFeeVnd;

    private LocalDateTime createdAt;
}