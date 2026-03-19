package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.Route;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RouteRepositoryCustom {
    Page<Route> getAllRoutes(String startProvinceId, String endProvinceId, Boolean isActive, Pageable pageable);
}
