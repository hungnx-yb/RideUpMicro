package com.rideup.trip_service.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RouteResponse {
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
