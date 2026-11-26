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

    private static final String TRIP_UNSTARTED_AUTO_CANCEL_TIMEOUT = "TRIP_UNSTARTED_AUTO_CANCEL_TIMEOUT";
    private static final int DEFAULT_UNSTARTED_CANCEL_MINUTES = 60;

    private static final String TRIP_AUTO_COMPLETE_TIMEOUT = "TRIP_AUTO_COMPLETE_TIMEOUT";
    private static final int DEFAULT_AUTO_COMPLETE_MINUTES = 30;

    RedisTemplate<String, Object> redisTemplate;

    public int getMarketplaceRequestTtlMinutes() {
        return readMinutes(MARKETPLACE_REQUEST_TTL, DEFAULT_TTL_MINUTES);
    }

    public int getTripUnstartedAutoCancelMinutes() {
        return readMinutes(TRIP_UNSTARTED_AUTO_CANCEL_TIMEOUT, DEFAULT_UNSTARTED_CANCEL_MINUTES);
    }

    public int getTripAutoCompleteMinutes() {
        return readMinutes(TRIP_AUTO_COMPLETE_TIMEOUT, DEFAULT_AUTO_COMPLETE_MINUTES);
    }

    private int readMinutes(String configKey, int defaultMinutes) {
        try {
            Object value = redisTemplate.opsForHash().get(REDIS_KEY_SYSTEM_TIMEOUTS, configKey);
            if (value instanceof Number number && number.intValue() >= 0) {
                return number.intValue();
            }
        } catch (Exception e) {
            log.warn("[TimeoutConfig] Cannot read {} from Redis, fallback {} minutes: {}",
                    configKey, defaultMinutes, e.getMessage());
        }
        return defaultMinutes;
    }
}
