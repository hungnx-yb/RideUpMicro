package com.example.demo.service;

import com.example.demo.dto.request.driver.CommissionConfigUpdateRequest;
import com.example.demo.dto.response.driver.CommissionConfigResponse;
import com.example.demo.dto.response.driver.DriverCommissionRateResponse;
import com.example.demo.dto.response.driver.DriverEligibilityResponse;
import com.example.demo.dto.response.driver.DriverReputationResponse;
import com.example.demo.entity.CommissionConfig;
import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.exception.AppException;
import com.example.demo.exception.ErrorCode;
import com.example.demo.kafka.producer.SystemConfigEventPublisher;
import com.example.demo.repository.CommissionConfigRepository;
import com.example.demo.repository.DriverProfileRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;

/**
 * ADM-FEAT-01: Cấu hình hoa hồng động, điểm uy tín và hạn mức nợ.
 *
 * Công thức hoa hồng cá nhân hóa:
 *   ΔRating = (Rating - Rate_base) × W_rate
 *   ΔRep    = ((Reputation - Rep_base) / 10) × W_rep
 *   R_final = clamp(R_base - ΔRating - ΔRep, R_min, R_max)
 */
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
    AdminAuditLogService auditLogService;
    SystemConfigEventPublisher systemConfigEventPublisher;

    private static final String DEFAULT_CONFIG_ID = "DEFAULT";
    private static final String REDIS_KEY_COMMISSION_CONFIG = "config:commission_rate";
    private static final Duration CACHE_TTL = Duration.ofHours(24);
    private static final BigDecimal MAX_ALLOWED_RATE = new BigDecimal("0.50");

    // Giá trị mặc định theo tài liệu đặc tả ADM-FEAT-01
    public static final BigDecimal DEFAULT_BASE_RATE = new BigDecimal("0.1800");
    public static final BigDecimal DEFAULT_MIN_RATE = new BigDecimal("0.1200");
    public static final BigDecimal DEFAULT_MAX_RATE = new BigDecimal("0.2500");
    public static final double DEFAULT_RATING_BENCHMARK = 4.5;
    public static final BigDecimal DEFAULT_RATING_STEP = new BigDecimal("0.0200");
    public static final int DEFAULT_REPUTATION_BENCHMARK = 80;
    public static final BigDecimal DEFAULT_REPUTATION_STEP = new BigDecimal("0.0100");
    public static final BigDecimal DEFAULT_CREDIT_LIMIT = new BigDecimal("500000");
    public static final int DEFAULT_MIN_ACCEPT_SCORE = 50;

    /**
     * Lấy cấu hình hiện tại (Redis cache -> DB -> tạo mặc định).
     */
    public CommissionConfigResponse getCommissionConfig() {
        try {
            Object cached = redisTemplate.opsForValue().get(REDIS_KEY_COMMISSION_CONFIG);
            if (cached != null) {
                CommissionConfigResponse res = cached instanceof CommissionConfigResponse r
                        ? r
                        : objectMapper.convertValue(cached, CommissionConfigResponse.class);
                // Cache định dạng cũ (thiếu tham số hoặc thiếu tên người cập nhật) => bỏ qua, nạp lại từ DB
                boolean missingUpdaterName = res.getUpdatedBy() != null && res.getUpdatedByName() == null;
                if (res.getCreditLimit() != null && res.getRatingStep() != null && !missingUpdaterName) {
                    return res;
                }
            }
        } catch (Exception e) {
            log.warn("[CommissionService] Cannot read commission config from Redis: {}", e.getMessage());
        }

        CommissionConfig config = loadOrInitConfig();
        CommissionConfigResponse response = toResponse(config);
        cache(response);
        return response;
    }

    /**
     * Admin cập nhật cấu hình hoa hồng, hạn mức nợ và ngưỡng uy tín.
     */
    @Transactional
    public CommissionConfigResponse updateCommissionConfig(CommissionConfigUpdateRequest request) {
        // Ràng buộc: 0 < R_min <= R_base <= R_max <= 50%
        if (request.getMinRate().signum() <= 0
                || request.getMinRate().compareTo(request.getBaseRate()) > 0
                || request.getBaseRate().compareTo(request.getMaxRate()) > 0
                || request.getMaxRate().compareTo(MAX_ALLOWED_RATE) > 0) {
            log.error("[CommissionService] Invalid config range: min={}, base={}, max={}",
                    request.getMinRate(), request.getBaseRate(), request.getMaxRate());
            throw new AppException(ErrorCode.INVALID_COMMISSION_CONFIG);
        }

        CommissionConfig config = loadOrInitConfig();
        CommissionConfigResponse before = toResponse(config);

        config.setBaseRate(scaleRate(request.getBaseRate()));
        config.setMinRate(scaleRate(request.getMinRate()));
        config.setMaxRate(scaleRate(request.getMaxRate()));
        if (request.getRatingBenchmark() != null) {
            config.setRatingBenchmark(request.getRatingBenchmark());
        }
        if (request.getRatingStep() != null) {
            config.setRatingStep(scaleRate(request.getRatingStep()));
        }
        if (request.getReputationBenchmark() != null) {
            config.setReputationBenchmark(request.getReputationBenchmark());
        }
        if (request.getReputationStep() != null) {
            config.setReputationStep(scaleRate(request.getReputationStep()));
        }
        if (request.getCreditLimit() != null) {
            config.setCreditLimit(request.getCreditLimit().setScale(2, RoundingMode.HALF_UP));
        }
        if (request.getMinAcceptScore() != null) {
            config.setMinAcceptScore(request.getMinAcceptScore());
        }
        String actorId = currentActorId();
        config.setUpdatedBy(actorId);

        CommissionConfig saved = commissionConfigRepository.saveAndFlush(config);
        CommissionConfigResponse response = toResponse(saved);
        log.info("[CommissionService] Updated commission config by {}: {}", actorId, response);

        // Làm mới cache Redis (TTL 24h)
        try {
            redisTemplate.delete(REDIS_KEY_COMMISSION_CONFIG);
        } catch (Exception e) {
            log.warn("[CommissionService] Cannot evict Redis cache: {}", e.getMessage());
        }
        cache(response);

        auditLogService.record("UPDATE_COMMISSION_CONFIG", "COMMISSION_CONFIG", DEFAULT_CONFIG_ID,
                "Cập nhật tham số hoa hồng, hạn mức nợ và ngưỡng uy tín", before, response);
        systemConfigEventPublisher.publish("COMMISSION_CONFIG", actorId, response);

        return response;
    }

    /**
     * Tính tỷ lệ hoa hồng áp dụng R_final cho tài xế.
     */
    public BigDecimal calculateCommissionRate(DriverProfile driverProfile) {
        CommissionConfigResponse config = getCommissionConfig();
        double rating = driverProfile.getDriverRating() != null ? driverProfile.getDriverRating() : 5.0;
        int reputation = driverProfile.getReputationScore() != null ? driverProfile.getReputationScore() : 80;
        return calculateRate(config, rating, reputation);
    }

    /**
     * Hàm thuần dùng chung cho tính toán thực tế và mô phỏng.
     */
    public static BigDecimal calculateRate(CommissionConfigResponse config, double rating, int reputation) {
        double ratingBenchmark = config.getRatingBenchmark() != null ? config.getRatingBenchmark() : DEFAULT_RATING_BENCHMARK;
        double ratingStep = (config.getRatingStep() != null ? config.getRatingStep() : DEFAULT_RATING_STEP).doubleValue();
        int reputationBenchmark = config.getReputationBenchmark() != null ? config.getReputationBenchmark() : DEFAULT_REPUTATION_BENCHMARK;
        double reputationStep = (config.getReputationStep() != null ? config.getReputationStep() : DEFAULT_REPUTATION_STEP).doubleValue();

        double deltaRating = (rating - ratingBenchmark) * ratingStep;
        double deltaReputation = ((reputation - reputationBenchmark) / 10.0) * reputationStep;
        double appliedRate = config.getBaseRate().doubleValue() - deltaRating - deltaReputation;

        double finalRate = Math.max(config.getMinRate().doubleValue(),
                Math.min(config.getMaxRate().doubleValue(), appliedRate));
        return BigDecimal.valueOf(finalRate).setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * Kiểm tra tài xế có đủ điều kiện nhận chuyến hay không (hạn mức nợ & điểm uy tín).
     * Được trip-service / booking-service gọi thay cho việc hardcode 500.000đ.
     */
    public DriverEligibilityResponse getDriverEligibility(String driverIdOrUserId) {
        DriverProfile profile = driverProfileRepository.findById(driverIdOrUserId)
                .or(() -> driverProfileRepository.findByUserId(driverIdOrUserId))
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));

        CommissionConfigResponse config = getCommissionConfig();
        BigDecimal debt = profile.getSystemDebt() != null ? profile.getSystemDebt() : BigDecimal.ZERO;
        int reputation = profile.getReputationScore() != null ? profile.getReputationScore() : 80;
        BigDecimal creditLimit = config.getCreditLimit() != null ? config.getCreditLimit() : DEFAULT_CREDIT_LIMIT;
        int minAcceptScore = config.getMinAcceptScore() != null ? config.getMinAcceptScore() : DEFAULT_MIN_ACCEPT_SCORE;

        // Nợ >= hạn mức => khóa (giữ đúng ngữ nghĩa ">= 500k" của hệ thống cũ)
        boolean debtBlocked = creditLimit.signum() > 0 && debt.compareTo(creditLimit) >= 0;
        boolean reputationBlocked = reputation < minAcceptScore;

        return DriverEligibilityResponse.builder()
                .driverId(profile.getUser() != null ? profile.getUser().getId() : profile.getId())
                .systemDebt(debt)
                .creditLimit(creditLimit)
                .reputationScore(reputation)
                .minAcceptScore(minAcceptScore)
                .debtBlocked(debtBlocked)
                .reputationBlocked(reputationBlocked)
                .canAcceptTrips(!debtBlocked && !reputationBlocked)
                .build();
    }

    public DriverEligibilityResponse getMyEligibility() {
        return getDriverEligibility(currentActorId());
    }

    /**
     * Tra cứu chi tiết hoa hồng và mức chiết khấu của một tài xế.
     */
    public DriverCommissionRateResponse getDriverCommissionDetails(String driverId) {
        DriverProfile profile = findProfileByUserId(driverId);
        CommissionConfigResponse config = getCommissionConfig();
        BigDecimal finalRate = calculateCommissionRate(profile);

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
     * Lấy thông tin điểm uy tín của tài xế (kèm hoa hồng cá nhân hóa).
     */
    public DriverReputationResponse getDriverReputation(String driverId) {
        DriverProfile profile = findProfileByUserId(driverId);
        CommissionConfigResponse config = getCommissionConfig();
        BigDecimal effectiveRate = calculateCommissionRate(profile);
        BigDecimal discount = config.getBaseRate().subtract(effectiveRate)
                .setScale(4, RoundingMode.HALF_UP);

        return DriverReputationResponse.builder()
                .reputationScore(profile.getReputationScore())
                .totalDriverRides(profile.getTotalDriverRides() != null ? profile.getTotalDriverRides() : 0)
                .driverRating(profile.getDriverRating() != null ? profile.getDriverRating() : 5.0)
                .effectiveRate(effectiveRate)
                .discount(discount)
                .baseRate(config.getBaseRate())
                .build();
    }

    // ===================== Helpers =====================

    private DriverProfile findProfileByUserId(String driverId) {
        User user = userRepository.findById(driverId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        DriverProfile profile = user.getDriverProfile();
        if (profile == null) {
            throw new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND);
        }
        return profile;
    }

    private CommissionConfig loadOrInitConfig() {
        CommissionConfig config = commissionConfigRepository.findById(DEFAULT_CONFIG_ID)
                .orElseGet(() -> {
                    log.info("[CommissionService] Initializing default commission config");
                    return commissionConfigRepository.save(CommissionConfig.builder().id(DEFAULT_CONFIG_ID).build());
                });

        // Bản ghi cũ (trước khi bổ sung cột) có thể mang giá trị null => điền mặc định
        boolean patched = false;
        if (config.getRatingBenchmark() == null) { config.setRatingBenchmark(DEFAULT_RATING_BENCHMARK); patched = true; }
        if (config.getRatingStep() == null) { config.setRatingStep(DEFAULT_RATING_STEP); patched = true; }
        if (config.getReputationBenchmark() == null) { config.setReputationBenchmark(DEFAULT_REPUTATION_BENCHMARK); patched = true; }
        if (config.getReputationStep() == null) { config.setReputationStep(DEFAULT_REPUTATION_STEP); patched = true; }
        if (config.getCreditLimit() == null) { config.setCreditLimit(DEFAULT_CREDIT_LIMIT); patched = true; }
        if (config.getMinAcceptScore() == null) { config.setMinAcceptScore(DEFAULT_MIN_ACCEPT_SCORE); patched = true; }
        return patched ? commissionConfigRepository.save(config) : config;
    }

    private CommissionConfigResponse toResponse(CommissionConfig config) {
        return CommissionConfigResponse.builder()
                .baseRate(config.getBaseRate())
                .minRate(config.getMinRate())
                .maxRate(config.getMaxRate())
                .ratingBenchmark(config.getRatingBenchmark())
                .ratingStep(config.getRatingStep())
                .reputationBenchmark(config.getReputationBenchmark())
                .reputationStep(config.getReputationStep())
                .creditLimit(config.getCreditLimit())
                .minAcceptScore(config.getMinAcceptScore())
                .updatedBy(config.getUpdatedBy())
                .updatedByName(resolveUpdaterName(config.getUpdatedBy()))
                .updatedAt(config.getUpdatedAt() != null ? config.getUpdatedAt().toString() : null)
                .build();
    }

    private void cache(CommissionConfigResponse response) {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY_COMMISSION_CONFIG, response, CACHE_TTL);
        } catch (Exception e) {
            log.warn("[CommissionService] Cannot cache commission config in Redis: {}", e.getMessage());
        }
    }

    private String resolveUpdaterName(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        return userRepository.findById(userId)
                .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName().trim() : u.getEmail())
                .orElse(null);
    }

    private static BigDecimal scaleRate(BigDecimal value) {
        return value.setScale(4, RoundingMode.HALF_UP);
    }

    private String currentActorId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
}
