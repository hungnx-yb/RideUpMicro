package com.rideup.locationservice.repository;

import com.rideup.locationservice.entity.LocationDistanceConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationDistanceConfigRepository extends JpaRepository<LocationDistanceConfig, String> {

    Optional<LocationDistanceConfig> findByProvinceIdAndIsActiveTrue(String provinceId);

    Optional<LocationDistanceConfig> findByProvinceIdIsNullAndIsActiveTrue();

    Optional<LocationDistanceConfig> findByProvinceId(String provinceId);

    boolean existsByProvinceId(String provinceId);

    List<LocationDistanceConfig> findAllByOrderByCreatedAtDesc();
}

