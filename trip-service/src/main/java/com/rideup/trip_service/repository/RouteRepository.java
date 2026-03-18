package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.Route;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RouteRepository extends JpaRepository<Route, String> {

    boolean existsByStartProvinceIdAndEndProvinceId(String startProvinceId, String endProvinceId);

    boolean existsByStartProvinceIdAndEndProvinceIdAndIdNot(String startProvinceId, String endProvinceId, String id);

    @Query("""
	    SELECT r
	    FROM Route r
	    WHERE (:routeName IS NULL OR LOWER(r.routeName) LIKE LOWER(CONCAT('%', :routeName, '%')))
	      AND (:startProvinceId IS NULL OR r.startProvinceId = :startProvinceId)
	      AND (:endProvinceId IS NULL OR r.endProvinceId = :endProvinceId)
	      AND (:isActive IS NULL OR r.isActive = :isActive)
	    """)
    Page<Route> searchRoutes(
	    @Param("routeName") String routeName,
	    @Param("startProvinceId") String startProvinceId,
	    @Param("endProvinceId") String endProvinceId,
	    @Param("isActive") Boolean isActive,
	    Pageable pageable
    );
}
