package com.example.demo.service;

import com.example.demo.dto.request.driver.CommissionConfigUpdateRequest;
import com.example.demo.dto.response.driver.CommissionConfigResponse;
import com.example.demo.dto.response.driver.DriverCommissionRateResponse;
import com.example.demo.dto.response.driver.DriverReputationResponse;
import com.example.demo.entity.CommissionConfig;
import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.exception.AppException;
import com.example.demo.exception.ErrorCode;
import com.example.demo.repository.CommissionConfigRepository;
import com.example.demo.repository.DriverProfileRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CommissionService {

    CommissionConfigRepository commissionConfigRepository;
    DriverProfileRepository driverProfileRepository;
    UserRepository userRepository;
    RedisTemplate<String, Object> redisTemplate;
    ObjectMapper objectMapper;

    // Hằng số toán học cố định theo chính sách sàn
    private static final double BENCHMARK_RATING = 4.5;
    private static final double RATING_STEP = 0.02; // Mỗi 1 sao lệch tăng/giảm 2%
    private static final int BENCHMARK_REPUTATION = 80;
    private static final double REPUTATION_STEP = 0.01; // Mỗi 10 điểm uy tín lệch tăng/giảm 1%

    private static final String DEFAULT_CONFIG_ID = "DEFAULT";
    private static final String REDIS_KEY_COMMISSION_CONFIG = "config:commission_rate";

    private static final BigDecimal DEFAULT_BASE_RATE = new BigDecimal("0.1800");
    private static final BigDecimal DEFAULT_MIN_RATE = new BigDecimal("0.1200");
    private static final BigDecimal DEFAULT_MAX_RATE = new BigDecimal("0.2500");

    /**
     * Lấy cấu hình hoa hồng hiện tại (Ưu tiên Redis cache -> DB -> Giá trị mặc định)
     */
    public CommissionConfigResponse getCommissionConfig() {
        // 1. Thử lấy từ Redis
        try {
            Object cached = redisTemplate.opsForValue().get(REDIS_KEY_COMMISSION_CONFIG);
            if (cached != null) {
                if (cached instanceof CommissionConfigResponse res) {
                    return res;
                }
                return objectMapper.convertValue(cached, CommissionConfigResponse.class);
            }
        } catch (Exception e) {
            log.warn("[CommissionService] Cannot read commission config from Redis: {}", e.getMessage());
        }

        // 2. Lấy từ Database hoặc tạo mặc định nếu chưa tồn tại
        CommissionConfig config = commissionConfigRepository.findById(DEFAULT_CONFIG_ID)
                .orElseGet(() -> {
                    log.info("[CommissionService] Initializing default commission config (base=18%, min=12%, max=25%)");
                    CommissionConfig initial = CommissionConfig.builder()
                            .id(DEFAULT_CONFIG_ID)
                            .baseRate(DEFAULT_BASE_RATE)
                            .minRate(DEFAULT_MIN_RATE)
                            .maxRate(DEFAULT_MAX_RATE)
                            .build();
                    return commissionConfigRepository.save(initial);
                });

        CommissionConfigResponse response = CommissionConfigResponse.builder()
                .baseRate(config.getBaseRate())
                .minRate(config.getMinRate())
                .maxRate(config.getMaxRate())
                .build();

        // 3. Ghi vào Redis cache
        try {
            redisTemplate.opsForValue().set(REDIS_KEY_COMMISSION_CONFIG, response, Duration.ofHours(12));
        } catch (Exception e) {
            log.warn("[CommissionService] Cannot cache commission config in Redis: {}", e.getMessage());
        }

        return response;
    }

    /**
     * Admin cập nhật cấu hình hoa hồng (baseRate, minRate, maxRate)
     */
    @Transactional
    public CommissionConfigResponse updateCommissionConfig(CommissionConfigUpdateRequest request) {
        // Kiểm tra ràng buộc: 0 < minRate <= baseRate <= maxRate <= 1
        if (request.getMinRate().compareTo(request.getBaseRate()) > 0 ||
                request.getBaseRate().compareTo(request.getMaxRate()) > 0) {
            log.error("[CommissionService] Invalid config range: min={}, base={}, max={}",
                    request.getMinRate(), request.getBaseRate(), request.getMaxRate());
            throw new AppException(ErrorCode.INVALID_COMMISSION_CONFIG);
        }

        CommissionConfig config = commissionConfigRepository.findById(DEFAULT_CONFIG_ID)
                .orElseGet(() -> CommissionConfig.builder().id(DEFAULT_CONFIG_ID).build());

        config.setBaseRate(request.getBaseRate().setScale(4, RoundingMode.HALF_UP));
        config.setMinRate(request.getMinRate().setScale(4, RoundingMode.HALF_UP));
        config.setMaxRate(request.getMaxRate().setScale(4, RoundingMode.HALF_UP));

        CommissionConfig saved = commissionConfigRepository.save(config);
        log.info("[CommissionService] Updated commission config: base={}, min={}, max={}",
                saved.getBaseRate(), saved.getMinRate(), saved.getMaxRate());

        CommissionConfigResponse response = CommissionConfigResponse.builder()
                .baseRate(saved.getBaseRate())
                .minRate(saved.getMinRate())
                .maxRate(saved.getMaxRate())
                .build();

        // Xóa cache cũ để đồng bộ
        try {
            redisTemplate.delete(REDIS_KEY_COMMISSION_CONFIG);
            redisTemplate.opsForValue().set(REDIS_KEY_COMMISSION_CONFIG, response, Duration.ofHours(12));
        } catch (Exception e) {
            log.warn("[CommissionService] Cannot update Redis cache after config change: {}", e.getMessage());
        }

        return response;
    }

    /**
     * Tính toán tỷ lệ hoa hồng áp dụng R_final cho tài xế theo công thức cá nhân hóa
     */
    public BigDecimal calculateCommissionRate(DriverProfile driverProfile) {
        CommissionConfigResponse config = getCommissionConfig();

        double rating = driverProfile.getDriverRating() != null ? driverProfile.getDriverRating() : 5.0;
        int reputation = driverProfile.getReputationScore() != null ? driverProfile.getReputationScore() : 80;

        // Delta Rating = (Rating - 4.5) * 0.02
        double deltaRating = (rating - BENCHMARK_RATING) * RATING_STEP;

        // Delta Reputation = ((Reputation - 80) / 10) * 0.01
        double deltaReputation = ((reputation - BENCHMARK_REPUTATION) / 10.0) * REPUTATION_STEP;

        // R_applied = R_base - Delta_rating - Delta_reputation
        double appliedRate = config.getBaseRate().doubleValue() - deltaRating - deltaReputation;

        // Clamping an toàn trong khoảng [R_min, R_max]
        double finalRate = Math.max(config.getMinRate().doubleValue(),
                Math.min(config.getMaxRate().doubleValue(), appliedRate));

        return BigDecimal.valueOf(finalRate).setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * Tra cứu chi tiết hoa hồng và mức chiết khấu của một tài xế
     */
    public DriverCommissionRateResponse getDriverCommissionDetails(String driverId) {
        User user = userRepository.findById(driverId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        DriverProfile profile = user.getDriverProfile();
        if (profile == null) {
            throw new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND);
        }

        CommissionConfigResponse config = getCommissionConfig();
        BigDecimal finalRate = calculateCommissionRate(profile);

        // discountPercent = (baseRate - finalRate) * 100
        BigDecimal discountPercent = config.getBaseRate().subtract(finalRate)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);

        return DriverCommissionRateResponse.builder()
                .driverId(driverId)
                .baseRate(config.getBaseRate())
                .driverRating(profile.getDriverRating() != null ? profile.getDriverRating() : 5.0)
                .reputationScore(profile.getReputationScore())
                .appliedCommissionRate(finalRate)
                .discountPercent(discountPercent)
                .build();
    }

    /**
     * Lấy thông tin điểm uy tín của tài xế
     */
    public DriverReputationResponse getDriverReputation(String driverId) {
        User user = userRepository.findById(driverId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        DriverProfile profile = user.getDriverProfile();
        if (profile == null) {
            throw new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND);
        }

        return DriverReputationResponse.builder()
                .reputationScore(profile.getReputationScore())
                .totalDriverRides(profile.getTotalDriverRides() != null ? profile.getTotalDriverRides() : 0)
                .driverRating(profile.getDriverRating() != null ? profile.getDriverRating() : 5.0)
                .build();
    }
}
