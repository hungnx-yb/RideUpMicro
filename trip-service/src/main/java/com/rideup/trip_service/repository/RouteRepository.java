package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.Route;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RouteRepository extends JpaRepository<Route, String>, RouteRepositoryCustom {

    boolean existsByStartProvinceIdAndEndProvinceId(String startProvinceId, String endProvinceId);

    boolean existsByStartProvinceIdAndEndProvinceIdAndIdNot(String startProvinceId, String endProvinceId, String id);

    Optional<Route> findByStartProvinceIdAndEndProvinceId(String startProvinceId, String endProvinceId);

	Integer countByIsActive(Boolean isActive);
}
