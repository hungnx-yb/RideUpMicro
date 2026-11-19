package com.rideup.locationservice.service;

import com.rideup.locationservice.dto.request.LocationDistanceConfigRequest;
import com.rideup.locationservice.dto.response.LocationDistanceConfigResponse;
import com.rideup.locationservice.dto.response.MaxDistanceResponse;
import com.rideup.locationservice.entity.LocationDistanceConfig;
import com.rideup.locationservice.entity.Province;
import com.rideup.locationservice.exception.AppException;
import com.rideup.locationservice.exception.ErrorCode;
import com.rideup.locationservice.repository.LocationDistanceConfigRepository;
import com.rideup.locationservice.repository.ProvinceRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LocationDistanceConfigService {

    LocationDistanceConfigRepository distanceConfigRepository;
    ProvinceRepository provinceRepository;

    public static final double DEFAULT_GLOBAL_MAX_DISTANCE_KM = 20.0;

    /**
     * Lấy bán kính đón/trả tối đa (km và meters) theo Tỉnh/TP.
     * Áp dụng kế thừa phân cấp: Province Override -> Global Default -> Fallback 20km.
     */
    public MaxDistanceResponse getMaxDistance(String provinceId) {
        if (provinceId != null && !provinceId.isBlank()) {
            Optional<LocationDistanceConfig> provinceConfig = distanceConfigRepository
                    .findByProvinceIdAndIsActiveTrue(provinceId);

            if (provinceConfig.isPresent()) {
                LocationDistanceConfig config = provinceConfig.get();
                String provinceName = getProvinceName(config.getProvinceId());
                return MaxDistanceResponse.builder()
                        .provinceId(config.getProvinceId())
                        .provinceName(provinceName)
                        .maxDistanceKm(config.getMaxDistanceKm())
                        .maxDistanceMeters(config.getMaxDistanceKm() * 1000.0)
                        .isOverride(true)
                        .description(config.getDescription())
                        .build();
            }
        }

        // Kiểm tra Global Default
        Optional<LocationDistanceConfig> globalConfig = distanceConfigRepository
                .findByProvinceIdIsNullAndIsActiveTrue();

        if (globalConfig.isPresent()) {
            LocationDistanceConfig config = globalConfig.get();
            return MaxDistanceResponse.builder()
                    .provinceId(null)
                    .provinceName("Toàn quốc (Global Default)")
                    .maxDistanceKm(config.getMaxDistanceKm())
                    .maxDistanceMeters(config.getMaxDistanceKm() * 1000.0)
                    .isOverride(false)
                    .description(config.getDescription() != null ? config.getDescription() : "Cấu hình bán kính mặc định toàn sàn")
                    .build();
        }

        // Fallback mặc định an toàn 20km
        return MaxDistanceResponse.builder()
                .provinceId(null)
                .provinceName("Mặc định hệ thống")
                .maxDistanceKm(DEFAULT_GLOBAL_MAX_DISTANCE_KM)
                .maxDistanceMeters(DEFAULT_GLOBAL_MAX_DISTANCE_KM * 1000.0)
                .isOverride(false)
                .description("Cấu hình dự phòng 20km")
                .build();
    }

    public List<LocationDistanceConfigResponse> getAllConfigs() {
        return distanceConfigRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public LocationDistanceConfigResponse createConfig(LocationDistanceConfigRequest request) {
        String provinceId = (request.getProvinceId() != null && !request.getProvinceId().isBlank())
                ? request.getProvinceId().trim()
                : null;

        if (provinceId != null) {
            provinceRepository.findById(provinceId)
                    .orElseThrow(() -> new AppException(ErrorCode.PROVINCE_NOT_FOUND));

            if (distanceConfigRepository.existsByProvinceId(provinceId)) {
                throw new AppException(ErrorCode.LOCATION_CONFIG_EXISTED);
            }
        } else {
            // Kiểm tra đã có Global config chưa
            if (distanceConfigRepository.findByProvinceIdIsNullAndIsActiveTrue().isPresent()) {
                throw new AppException(ErrorCode.LOCATION_CONFIG_EXISTED);
            }
        }

        LocationDistanceConfig entity = LocationDistanceConfig.builder()
                .provinceId(provinceId)
                .maxDistanceKm(request.getMaxDistanceKm())
                .description(request.getDescription())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        LocationDistanceConfig saved = distanceConfigRepository.save(entity);
        log.info("[LocationDistanceConfig] Created config id={}, provinceId={}, maxKm={}",
                saved.getId(), saved.getProvinceId(), saved.getMaxDistanceKm());
        return toResponse(saved);
    }

    @Transactional
    public LocationDistanceConfigResponse updateConfig(String id, LocationDistanceConfigRequest request) {
        LocationDistanceConfig config = distanceConfigRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LOCATION_CONFIG_NOT_FOUND));

        if (request.getMaxDistanceKm() != null) {
            config.setMaxDistanceKm(request.getMaxDistanceKm());
        }
        if (request.getDescription() != null) {
            config.setDescription(request.getDescription());
        }
        if (request.getIsActive() != null) {
            config.setIsActive(request.getIsActive());
        }

        LocationDistanceConfig saved = distanceConfigRepository.save(config);
        log.info("[LocationDistanceConfig] Updated config id={}, maxKm={}, isActive={}",
                saved.getId(), saved.getMaxDistanceKm(), saved.getIsActive());
        return toResponse(saved);
    }

    @Transactional
    public void deleteConfig(String id) {
        LocationDistanceConfig config = distanceConfigRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LOCATION_CONFIG_NOT_FOUND));
        distanceConfigRepository.delete(config);
        log.info("[LocationDistanceConfig] Deleted config id={}", id);
    }

    private LocationDistanceConfigResponse toResponse(LocationDistanceConfig entity) {
        String provinceName = entity.getProvinceId() != null
                ? getProvinceName(entity.getProvinceId())
                : "Toàn quốc (Global Default)";

        return LocationDistanceConfigResponse.builder()
                .id(entity.getId())
                .provinceId(entity.getProvinceId())
                .provinceName(provinceName)
                .maxDistanceKm(entity.getMaxDistanceKm())
                .maxDistanceMeters(entity.getMaxDistanceKm() * 1000.0)
                .description(entity.getDescription())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private String getProvinceName(String provinceId) {
        if (provinceId == null) return null;
        return provinceRepository.findById(provinceId)
                .map(Province::getName)
                .orElse(provinceId);
    }
}

