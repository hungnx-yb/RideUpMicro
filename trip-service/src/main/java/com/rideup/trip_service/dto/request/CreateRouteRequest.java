package com.rideup.trip_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateRouteRequest {

	@NotBlank(message = "Route name is required")
	String routeName;

	@NotBlank(message = "Start province is required")
	String startProvinceId;

	@NotBlank(message = "End province is required")
	String endProvinceId;

	@NotNull(message = "Base price is required")
	@DecimalMin(value = "0.0", inclusive = false, message = "Base price must be greater than 0")
	BigDecimal basePriceVnd;

	@NotNull(message = "Distance is required")
	@DecimalMin(value = "0.0", inclusive = false, message = "Distance must be greater than 0")
	BigDecimal distanceKm;

	@NotNull(message = "Estimated duration is required")
	@Min(value = 1, message = "Estimated duration must be at least 1 minute")
	Integer estimatedDurationMin;

}
