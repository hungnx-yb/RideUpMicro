package com.rideup.trip_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.trip_service.dto.request.UpdateFareBoundaryRequest;
import com.rideup.trip_service.dto.response.FareBoundaryResponse;
import com.rideup.trip_service.dto.response.FareEstimateResponse;
import com.rideup.trip_service.dto.response.ProvinceResponse;
import com.rideup.trip_service.entity.FareBoundaryConfig;
import com.rideup.trip_service.exception.AppException;
import com.rideup.trip_service.exception.ErrorCode;
import com.rideup.trip_service.feignClient.LocationServiceClient;
import com.rideup.trip_service.kafka.producer.AdminAuditPublisher;
import com.rideup.trip_service.repository.FareBoundaryConfigRepository;
import com.rideup.trip_service.utils.SecurityUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.Duration;
import java.util.Locale;

/**
 * ADM-FEAT-05: Khung giá cước tham chiếu theo km.
 *
 * Giá vé 1 ghế hợp lệ ∈ [DistanceKm × min_price_per_km, DistanceKm × max_price_per_km].
 * DistanceKm = khoảng cách Haversine giữa tâm 2 tỉnh × hệ số đường bộ (road_factor).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FareBoundaryService {

    private static final String CONFIG_ID = "DEFAULT";
    private static final String REDIS_KEY = "config:fare_boundary";
    private static final Duration CACHE_TTL = Duration.ofHours(24);
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final BigDecimal ROUND_UNIT = new BigDecimal("1000");

    FareBoundaryConfigRepository repository;
    LocationServiceClient locationServiceClient;
    RedisTemplate<String, Object> redisTemplate;
    ObjectMapper objectMapper;
    AdminAuditPublisher auditPublisher;

    public FareBoundaryResponse getConfig() {
        try {
            Object cached = redisTemplate.opsForValue().get(REDIS_KEY);
            if (cached != null) {
                return cached instanceof FareBoundaryResponse r
                        ? r : objectMapper.convertValue(cached, FareBoundaryResponse.class);
            }
        } catch (Exception e) {
            log.warn("[FareBoundary] Cannot read config from Redis: {}", e.getMessage());
        }
        FareBoundaryResponse response = toResponse(loadOrInit());
        cache(response);
        return response;
    }

    @Transactional
    public FareBoundaryResponse updateConfig(UpdateFareBoundaryRequest request) {
        if (request.getMinPricePerKm().compareTo(request.getMaxPricePerKm()) > 0) {
            throw new AppException(ErrorCode.INVALID_FARE_BOUNDARY);
        }
        FareBoundaryConfig config = loadOrInit();
        FareBoundaryResponse before = toResponse(config);

        config.setMinPricePerKm(request.getMinPricePerKm().setScale(2, RoundingMode.HALF_UP));
        config.setMaxPricePerKm(request.getMaxPricePerKm().setScale(2, RoundingMode.HALF_UP));
        if (request.getRoadFactor() != null) {
            config.setRoadFactor(request.getRoadFactor().setScale(2, RoundingMode.HALF_UP));
        }
        if (request.getEnabled() != null) {
            config.setEnabled(request.getEnabled());
        }
        config.setUpdatedBy(SecurityUtils.getCurrentUserId());

        FareBoundaryResponse response = toResponse(repository.saveAndFlush(config));
        cache(response);
        auditPublisher.publish("UPDATE_FARE_BOUNDARY", "FARE_BOUNDARY_CONFIG", CONFIG_ID,
                "Cập nhật khung giá cước theo km", before, response);
        log.info("[FareBoundary] Updated: {}", response);
        return response;
    }

    /** Ước tính khoảng giá hợp lệ cho tuyến (driver app hiển thị gợi ý khi tạo chuyến). */
    public FareEstimateResponse estimate(String startProvinceId, String endProvinceId) {
        FareBoundaryResponse config = getConfig();
        FareEstimateResponse.FareEstimateResponseBuilder builder = FareEstimateResponse.builder()
                .startProvinceId(startProvinceId)
                .endProvinceId(endProvinceId)
                .minPricePerKm(config.getMinPricePerKm())
                .maxPricePerKm(config.getMaxPricePerKm())
                .applicable(false);

        BigDecimal distanceKm = estimateDistanceKm(startProvinceId, endProvinceId, config.getRoadFactor());
        if (distanceKm == null) {
            return builder.build();
        }

        BigDecimal minPrice = roundDown(distanceKm.multiply(config.getMinPricePerKm()));
        BigDecimal maxPrice = roundUp(distanceKm.multiply(config.getMaxPricePerKm()));
        return builder
                .distanceKm(distanceKm)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .applicable(Boolean.TRUE.equals(config.getEnabled()))
                .build();
    }

    /** Chặn tạo chuyến nếu giá vé phá giá hoặc đội giá so với khung tham chiếu. */
    public void validateTripPrice(String startProvinceId, String endProvinceId, BigDecimal pricePerSeat) {
        if (pricePerSeat == null) {
            return;
        }
        FareEstimateResponse estimate = estimate(startProvinceId, endProvinceId);
        if (!estimate.isApplicable()) {
            return;
        }
        if (pricePerSeat.compareTo(estimate.getMinPrice()) < 0 || pricePerSeat.compareTo(estimate.getMaxPrice()) > 0) {
            NumberFormat vnd = NumberFormat.getInstance(new Locale("vi", "VN"));
            String message = String.format(
                    "Giá vé %sđ/ghế không hợp lệ. Tuyến dài khoảng %s km, giá vé cho phép từ %sđ đến %sđ/ghế.",
                    vnd.format(pricePerSeat), estimate.getDistanceKm().toPlainString(),
                    vnd.format(estimate.getMinPrice()), vnd.format(estimate.getMaxPrice()));
            throw new AppException(ErrorCode.FARE_OUT_OF_RANGE, message);
        }
    }

    // ===================== Helpers =====================

    private BigDecimal estimateDistanceKm(String startProvinceId, String endProvinceId, BigDecimal roadFactor) {
        if (startProvinceId == null || endProvinceId == null || startProvinceId.equals(endProvinceId)) {
            return null; // chuyến nội tỉnh: không áp khung giá liên tỉnh
        }
        try {
            ProvinceResponse start = locationServiceClient.getProvinceById(startProvinceId).getResult();
            ProvinceResponse end = locationServiceClient.getProvinceById(endProvinceId).getResult();
            if (start == null || end == null || start.getLat() == null || start.getLng() == null
                    || end.getLat() == null || end.getLng() == null) {
                return null;
            }
            double straight = haversineKm(start.getLat().doubleValue(), start.getLng().doubleValue(),
                    end.getLat().doubleValue(), end.getLng().doubleValue());
            double factor = roadFactor != null ? roadFactor.doubleValue() : 1.3;
            return BigDecimal.valueOf(straight * factor).setScale(0, RoundingMode.HALF_UP);
        } catch (Exception e) {
            log.warn("[FareBoundary] Cannot estimate distance {} -> {}: {}", startProvinceId, endProvinceId, e.getMessage());
            return null;
        }
    }

    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static BigDecimal roundDown(BigDecimal value) {
        return value.divide(ROUND_UNIT, 0, RoundingMode.FLOOR).multiply(ROUND_UNIT);
    }

    private static BigDecimal roundUp(BigDecimal value) {
        return value.divide(ROUND_UNIT, 0, RoundingMode.CEILING).multiply(ROUND_UNIT);
    }

    private FareBoundaryConfig loadOrInit() {
        return repository.findById(CONFIG_ID)
                .orElseGet(() -> repository.save(FareBoundaryConfig.builder().id(CONFIG_ID).build()));
    }

    private FareBoundaryResponse toResponse(FareBoundaryConfig config) {
        return FareBoundaryResponse.builder()
                .minPricePerKm(config.getMinPricePerKm())
                .maxPricePerKm(config.getMaxPricePerKm())
                .roadFactor(config.getRoadFactor())
                .enabled(config.getEnabled())
                .updatedBy(config.getUpdatedBy())
                .updatedAt(config.getUpdatedAt() != null ? config.getUpdatedAt().toString() : null)
                .build();
    }

    private void cache(FareBoundaryResponse response) {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY, response, CACHE_TTL);
        } catch (Exception e) {
            log.warn("[FareBoundary] Cannot cache config in Redis: {}", e.getMessage());
        }
    }
}
