package com.rideup.trip_service.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * ADM-FEAT-03: Đọc tham số timeout của Chợ nhu cầu từ Redis hash "config:system_timeouts".
 * booking-service là service sở hữu cấu hình (bảng system_timeout_config) và đồng bộ sang Redis.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MarketplaceTimeoutReader {

    private static final String REDIS_KEY_SYSTEM_TIMEOUTS = "config:system_timeouts";
    private static final String MARKETPLACE_REQUEST_TTL = "MARKETPLACE_REQUEST_TTL";
    private static final int DEFAULT_TTL_MINUTES = 1440;
    private static final int MIN_TTL_MINUTES = 30;
    private static final int MAX_TTL_MINUTES = 4320;

    RedisTemplate<String, Object> redisTemplate;

    public int getMarketplaceRequestTtlMinutes() {
        try {
            Object value = redisTemplate.opsForHash().get(REDIS_KEY_SYSTEM_TIMEOUTS, MARKETPLACE_REQUEST_TTL);
            if (value instanceof Number number) {
                return Math.max(MIN_TTL_MINUTES, Math.min(MAX_TTL_MINUTES, number.intValue()));
            }
        } catch (Exception e) {
            log.warn("[TimeoutConfig] Cannot read {} from Redis, fallback {} minutes: {}",
                    MARKETPLACE_REQUEST_TTL, DEFAULT_TTL_MINUTES, e.getMessage());
        }
        return DEFAULT_TTL_MINUTES;
    }
}
