package com.rideup.trip_service.controller;

import com.rideup.trip_service.dto.request.CreateRouteRequest;
import com.rideup.trip_service.dto.request.RouteActivationRequest;
import com.rideup.trip_service.dto.request.UpdateRouteRequest;
import com.rideup.trip_service.dto.response.*;
import com.rideup.trip_service.feignClient.LocationServiceClient;
import com.rideup.trip_service.service.RouteService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/route")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RouteController {

    RouteService routeService;


    @PostMapping
    public ApiResponse<RouteResponse> createRoute(@Valid @RequestBody CreateRouteRequest request) {
	return ApiResponse.<RouteResponse>builder()
			.result(routeService.createRoute(request))
			.message("Route created successfully")
			.build();
    }

	@PostMapping("/suggest")
	public ApiResponse<RouteResponse> suggestRoute(@Valid @RequestBody CreateRouteRequest request) {
		return ApiResponse.<RouteResponse>builder()
				.result(routeService.suggestRoute(request))
				.message("Route suggested successfully")
				.build();
	}

    @PutMapping("/{id}")
    public ApiResponse<RouteResponse> updateRoute(@PathVariable String id,
						  @Valid @RequestBody UpdateRouteRequest request) {
	RouteResponse result = routeService.updateRoute(id, request);
	return ApiResponse.<RouteResponse>builder()
		.result(result)
		.build();
    }

    @PatchMapping("/{id}/activate")
    public ApiResponse<RouteResponse> activateRoute(@PathVariable String id,
						    @Valid @RequestBody RouteActivationRequest request) {
	RouteResponse result = routeService.activateRoute(id, request.getIsActive());
	return ApiResponse.<RouteResponse>builder()
		.result(result)
		.build();
    }


	@GetMapping("/count/routes")
	public ApiResponse<Integer> getRoutesCount(@RequestParam Boolean isActive) {
		return ApiResponse.<Integer>builder()
				.result(routeService.countRoute(isActive))
				.build();
	}

	@GetMapping
	public ApiResponse<?> getRoutes(
						@RequestParam(required = false) String startProvinceId,
						@RequestParam(required = false) String endProvinceId,
						@RequestParam(required = false) Boolean isActive,
						Pageable pageable

	){
		PageResponse<RouteResponse> pageResponse = routeService.getAllRoutes(startProvinceId, endProvinceId, isActive, pageable);
		return ApiResponse.<List<RouteResponse>>builder()
				.result(pageResponse.getItems())
				.message("Routes retrieved successfully")
				.count(pageResponse.getMeta().getTotalElements())
				.build();
	}


	@GetMapping("/detail")
	public ApiResponse<RouteResponse> getRouteDetailByStartAndEnd(
			@RequestParam String startProvinceId,
			@RequestParam String endProvinceId) {

		return ApiResponse.<RouteResponse>builder()
				.result(routeService.getRouteDetailByStartAndEnd(startProvinceId, endProvinceId))
				.message("Route detail retrieved successfully")
				.build();

	}
}
