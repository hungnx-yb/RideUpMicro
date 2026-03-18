package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.response.ProvinceResponse;
import com.rideup.trip_service.dto.response.UserResponse;
import com.rideup.trip_service.feignClient.IdentityServiceClient;
import com.rideup.trip_service.feignClient.LocationServiceClient;
import com.rideup.trip_service.dto.request.CreateRouteRequest;
import com.rideup.trip_service.dto.request.UpdateRouteRequest;
import com.rideup.trip_service.dto.response.RouteResponse;
import com.rideup.trip_service.entity.Route;
import com.rideup.trip_service.exception.AppException;
import com.rideup.trip_service.exception.ErrorCode;
import com.rideup.trip_service.repository.RouteRepository;
import feign.FeignException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RouteService {

	RouteRepository routeRepository;
	LocationServiceClient locationClient;
	ModelMapper modelMapper;
	IdentityServiceClient identifyClient;
	@Transactional
	public RouteResponse createRoute(CreateRouteRequest request) {
		UserResponse admin = identifyClient.getUserInfo().getResult();
		String startProvinceId = request.getStartProvinceId().trim();
		String endProvinceId = request.getEndProvinceId().trim();
		validateRoute(startProvinceId, endProvinceId);
		LocalDateTime now = LocalDateTime.now();
		Route route = modelMapper.map(request, Route.class);
		route.setCreatedBy(admin.getId());
		route.setIsActive(true);
		return modelMapper.map(routeRepository.save(route), RouteResponse.class);
	}

	@Transactional
	public RouteResponse updateRoute(String id, UpdateRouteRequest request) {
		Route route = findRouteById(id);
		modelMapper.map(request, route);
		return modelMapper.map(routeRepository.save(route), RouteResponse.class);
	}

	@Transactional(readOnly = true)
	public RouteResponse getRouteById(String id) {
		Route route = findRouteById(id);
		return modelMapper.map(route, RouteResponse.class);
	}


	@Transactional
	public RouteResponse activateRoute(String id, Boolean isActive) {
		Route route = findRouteById(id);
		route.setIsActive(isActive);
		route.setUpdatedAt(LocalDateTime.now());
		return modelMapper.map(routeRepository.save(route), RouteResponse.class);
	}

	public RouteResponse suggestRoute(CreateRouteRequest request) {
		UserResponse admin = identifyClient.getUserInfo().getResult();
		String startProvinceId = request.getStartProvinceId().trim();
		String endProvinceId = request.getEndProvinceId().trim();
		validateRoute(startProvinceId, endProvinceId);
		LocalDateTime now = LocalDateTime.now();
		Route route = modelMapper.map(request, Route.class);
		route.setCreatedBy(admin.getId());
		route.setIsActive(true);
		return modelMapper.map(routeRepository.save(route), RouteResponse.class);
	}

	private Route findRouteById(String id) {
		return routeRepository.findById(id)
				.orElseThrow(() -> new AppException(ErrorCode.ROUTE_NOT_FOUND));
	}

	private void validateProvince(String provinceId) {
		try {
			ProvinceResponse response = locationClient.getProvinceById(provinceId).getResult();
			if (response == null ) {
				throw new AppException(ErrorCode.INVALID_PROVINCE_ID);
			}
		} catch (FeignException.NotFound ex) {
			throw new AppException(ErrorCode.INVALID_PROVINCE_ID);
		} catch (FeignException ex) {
			throw new AppException(ErrorCode.LOCATION_SERVICE_UNAVAILABLE);
		}
	}


	private void validateRoute(String startProvinceId, String endProvinceId) {
		if (routeRepository.existsByStartProvinceIdAndEndProvinceId(startProvinceId, endProvinceId)) {
			throw new AppException(ErrorCode.ROUTE_ALREADY_EXISTS);
		}
		validateProvince(startProvinceId);
		validateProvince(endProvinceId);
	}
}
