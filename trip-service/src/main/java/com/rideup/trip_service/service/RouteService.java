package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.response.PageResponse;
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
import jakarta.persistence.SecondaryTable;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

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

	@Transactional
	public RouteResponse activateRoute(String id, Boolean isActive) {
		Route route = findRouteById(id);
		route.setIsActive(isActive);
		route.setUpdatedAt(LocalDateTime.now());
		return modelMapper.map(routeRepository.save(route), RouteResponse.class);
	}

	public RouteResponse suggestRoute(CreateRouteRequest request) {
		UserResponse driver = identifyClient.getUserInfo().getResult();
		String startProvinceId = request.getStartProvinceId().trim();
		String endProvinceId = request.getEndProvinceId().trim();
		validateRoute(startProvinceId, endProvinceId);
		LocalDateTime now = LocalDateTime.now();
		Route route = modelMapper.map(request, Route.class);
		route.setCreatedBy(driver.getId());
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

	public PageResponse<RouteResponse> getAllRoutes(String startProvinceId, String endProvinceId, Boolean isActive, Pageable pageable){
		Page<Route> routePage = routeRepository.getAllRoutes(startProvinceId, endProvinceId, isActive, pageable);
		List<String> userIds = routePage.getContent().stream()
				.map(Route::getCreatedBy)
				.distinct()
				.toList();

		List<UserResponse> users = identifyClient.getUsersInfoByIds(userIds).getResult();
		Map<String, UserResponse> mapUser = users.stream()
				.collect(Collectors.toMap(UserResponse::getId, Function.identity()));

		List<RouteResponse> routeResult = routePage.getContent().stream()
				.map(route -> {
					UserResponse createdByUser = mapUser.get(route.getCreatedBy());
					RouteResponse routeResponse = modelMapper.map(route, RouteResponse.class);
					routeResponse.setFullName(createdByUser.getFullName());
					routeResponse.setEmail(createdByUser.getEmail());
					routeResponse.setSdt(createdByUser.getPhoneNumber());

					return routeResponse;
				})
				.toList();


		PageResponse.Meta meta = PageResponse.Meta.builder()
				.page(routePage.getNumber())
				.size(routePage.getSize())
				.totalElements(routePage.getTotalElements())
				.totalPages(routePage.getTotalPages())
				.build();

		PageResponse<RouteResponse> pageResponse = new PageResponse<>();
		pageResponse.setItems(routeResult);
		pageResponse.setMeta(meta);
		return pageResponse;
	}


	public Integer countRoute(Boolean isActive) {
		return routeRepository.countByIsActive(isActive);
	}

	public RouteResponse getRouteDetailByStartAndEnd(String startProvinceId, String endProvinceId) {
		Route route = routeRepository.findByStartProvinceIdAndEndProvinceId(startProvinceId, endProvinceId).orElseThrow(()-> new AppException(ErrorCode.ROUTE_NOT_FOUND));
		return modelMapper.map(route, RouteResponse.class);
	}

}
