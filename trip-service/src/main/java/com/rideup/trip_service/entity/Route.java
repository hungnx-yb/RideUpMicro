package com.rideup.trip_service.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;
    String routeName;
    String startProvinceId;
    String endProvinceId;
    BigDecimal basePriceVnd;
    BigDecimal distanceKm;
    Integer estimatedDurationMin;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}