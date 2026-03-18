package com.rideup.trip_service.controller;

import com.rideup.trip_service.dto.request.CreateRouteRequest;
import com.rideup.trip_service.dto.request.RouteActivationRequest;
import com.rideup.trip_service.dto.request.UpdateRouteRequest;
import com.rideup.trip_service.dto.response.ApiResponse;
import com.rideup.trip_service.dto.response.ProvinceResponse;
import com.rideup.trip_service.dto.response.RoutePageResponse;
import com.rideup.trip_service.dto.response.RouteResponse;
import com.rideup.trip_service.feignClient.LocationServiceClient;
import com.rideup.trip_service.service.RouteService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/route")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RouteController {

    RouteService routeService;
	LocationServiceClient  locationServiceClient;

    @PostMapping
    public ApiResponse<RouteResponse> createRoute(@Valid @RequestBody CreateRouteRequest request) {
	RouteResponse result = routeService.createRoute(request);
	return ApiResponse.<RouteResponse>builder()
		.result(result)
		.build();
    }


    @GetMapping("/{id}")
    public ApiResponse<RouteResponse> getRouteById(@PathVariable String id) {
	RouteResponse result = routeService.getRouteById(id);
	return ApiResponse.<RouteResponse>builder()
		.result(result)
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

	@GetMapping("/test")
	public ApiResponse<String> test(@RequestParam(required = false) String provinceId) {
		ProvinceResponse response = locationServiceClient.getProvinceById(provinceId).getResult();
		return ApiResponse.<String>builder()
			.result(response.getName())
			.build();
	}
}
