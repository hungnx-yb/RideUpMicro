package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.request.UpdateSystemTimeoutRequest;
import com.rideUp.booking_service.dto.response.SystemTimeoutConfigResponse;
import com.rideUp.booking_service.entity.SystemTimeoutConfig;
import com.rideUp.booking_service.enums.TimeoutConfigKey;
import com.rideUp.booking_service.exception.AppException;
import com.rideUp.booking_service.exception.ErrorCode;
import com.rideUp.booking_service.kafka.producer.AdminAuditPublisher;
import com.rideUp.booking_service.repository.SystemTimeoutConfigRepository;
import com.rideUp.booking_service.utils.SecurityUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ADM-FEAT-03: Quản trị & đọc tham số timeout vận hành (SLA).
 *
 * Thứ tự đọc: Redis hash "config:system_timeouts" -> bảng system_timeout_config -> giá trị mặc định.
 * Khi Admin cập nhật: ghi DB -> đồng bộ ngay sang Redis (trip-service đọc chung key này).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SystemTimeoutConfigService {

    public static final String REDIS_KEY_SYSTEM_TIMEOUTS = "config:system_timeouts";

    SystemTimeoutConfigRepository repository;
    RedisTemplate<String, Object> redisTemplate;
    AdminAuditPublisher auditPublisher;

    /**
     * Khởi tạo giá trị mặc định cho các key còn thiếu và nạp toàn bộ sang Redis khi service khởi động.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initializeAndSync() {
        try {
            for (TimeoutConfigKey key : TimeoutConfigKey.values()) {
                if (!repository.existsById(key.name())) {
                    repository.save(SystemTimeoutConfig.builder()
                            .configKey(key.name())
                            .valueMinutes(key.getDefaultMinutes())
                            .updatedBy("SYSTEM")
                            .build());
                }
            }
            syncAllToRedis();
            log.info("[TimeoutConfig] Initialized & synced {} timeout configs to Redis", TimeoutConfigKey.values().length);
        } catch (Exception e) {
            log.warn("[TimeoutConfig] Cannot initialize timeout configs: {}", e.getMessage());
        }
    }

    /** Lấy số phút timeout hiện hành (an toàn: luôn trả về giá trị hợp lệ). */
    public int getMinutes(TimeoutConfigKey key) {
        try {
            Object cached = redisTemplate.opsForHash().get(REDIS_KEY_SYSTEM_TIMEOUTS, key.name());
            if (cached instanceof Number number) {
                return clamp(key, number.intValue());
            }
        } catch (Exception e) {
            log.warn("[TimeoutConfig] Cannot read {} from Redis: {}", key, e.getMessage());
        }
        try {
            return repository.findById(key.name())
                    .map(cfg -> clamp(key, cfg.getValueMinutes()))
                    .orElse(key.getDefaultMinutes());
        } catch (Exception e) {
            log.warn("[TimeoutConfig] Cannot read {} from DB, fallback default: {}", key, e.getMessage());
            return key.getDefaultMinutes();
        }
    }

    @Transactional(readOnly = true)
    public List<SystemTimeoutConfigResponse> getAll() {
        Map<String, SystemTimeoutConfig> stored = new LinkedHashMap<>();
        repository.findAll().forEach(cfg -> stored.put(cfg.getConfigKey(), cfg));
        return Arrays.stream(TimeoutConfigKey.values())
                .map(key -> toResponse(key, stored.get(key.name())))
                .toList();
    }

    @Transactional
    public SystemTimeoutConfigResponse update(String configKey, Integer valueMinutes) {
        TimeoutConfigKey key = parseKey(configKey);
        if (valueMinutes == null || valueMinutes < key.getMinMinutes() || valueMinutes > key.getMaxMinutes()) {
            throw new AppException(ErrorCode.INVALID_TIMEOUT_CONFIG);
        }

        SystemTimeoutConfig config = repository.findById(key.name())
                .orElseGet(() -> SystemTimeoutConfig.builder().configKey(key.name()).build());
        Integer oldValue = config.getValueMinutes() != null ? config.getValueMinutes() : key.getDefaultMinutes();

        config.setValueMinutes(valueMinutes);
        config.setUpdatedBy(SecurityUtils.getCurrentUserId());
        SystemTimeoutConfig saved = repository.saveAndFlush(config);

        try {
            redisTemplate.opsForHash().put(REDIS_KEY_SYSTEM_TIMEOUTS, key.name(), valueMinutes);
        } catch (Exception e) {
            log.warn("[TimeoutConfig] Cannot sync {} to Redis: {}", key, e.getMessage());
        }

        if (!oldValue.equals(valueMinutes)) {
            auditPublisher.publish("UPDATE_SYSTEM_TIMEOUT", "SYSTEM_TIMEOUT_CONFIG", key.name(),
                    "Cập nhật timeout: " + key.getDisplayName(),
                    Map.of("configKey", key.name(), "valueMinutes", oldValue),
                    Map.of("configKey", key.name(), "valueMinutes", valueMinutes));
        }
        log.info("[TimeoutConfig] {} updated: {} -> {} minutes", key, oldValue, valueMinutes);
        return toResponse(key, saved);
    }

    /** Cập nhật hàng loạt: kiểm tra toàn bộ trước, chỉ ghi khi tất cả hợp lệ. */
    @Transactional
    public List<SystemTimeoutConfigResponse> updateAll(List<UpdateSystemTimeoutRequest> requests) {
        for (UpdateSystemTimeoutRequest req : requests) {
            TimeoutConfigKey key = parseKey(req.getConfigKey());
            if (req.getValueMinutes() == null
                    || req.getValueMinutes() < key.getMinMinutes()
                    || req.getValueMinutes() > key.getMaxMinutes()) {
                throw new AppException(ErrorCode.INVALID_TIMEOUT_CONFIG);
            }
        }
        requests.forEach(req -> update(req.getConfigKey(), req.getValueMinutes()));
        return getAll();
    }

    @Transactional
    public SystemTimeoutConfigResponse resetToDefault(String configKey) {
        TimeoutConfigKey key = parseKey(configKey);
        return update(key.name(), key.getDefaultMinutes());
    }

    // ===================== Helpers =====================

    private void syncAllToRedis() {
        Map<String, Object> values = new LinkedHashMap<>();
        for (TimeoutConfigKey key : TimeoutConfigKey.values()) {
            int minutes = repository.findById(key.name())
                    .map(SystemTimeoutConfig::getValueMinutes)
                    .orElse(key.getDefaultMinutes());
            values.put(key.name(), minutes);
        }
        redisTemplate.opsForHash().putAll(REDIS_KEY_SYSTEM_TIMEOUTS, values);
    }

    private TimeoutConfigKey parseKey(String configKey) {
        try {
            return TimeoutConfigKey.valueOf(configKey == null ? "" : configKey.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.TIMEOUT_CONFIG_NOT_FOUND);
        }
    }

    private static int clamp(TimeoutConfigKey key, Integer value) {
        if (value == null) {
            return key.getDefaultMinutes();
        }
        return Math.max(key.getMinMinutes(), Math.min(key.getMaxMinutes(), value));
    }

    private SystemTimeoutConfigResponse toResponse(TimeoutConfigKey key, SystemTimeoutConfig stored) {
        return SystemTimeoutConfigResponse.builder()
                .configKey(key.name())
                .displayName(key.getDisplayName())
                .valueMinutes(stored != null && stored.getValueMinutes() != null
                        ? stored.getValueMinutes() : key.getDefaultMinutes())
                .defaultMinutes(key.getDefaultMinutes())
                .minMinutes(key.getMinMinutes())
                .maxMinutes(key.getMaxMinutes())
                .ownerService(key.getOwnerService())
                .expireAction(key.getExpireAction())
                .updatedBy(stored != null ? stored.getUpdatedBy() : null)
                .updatedAt(stored != null ? stored.getUpdatedAt() : null)
                .build();
    }
}
