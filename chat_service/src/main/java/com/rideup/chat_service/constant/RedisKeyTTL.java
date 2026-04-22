package com.rideup.chat_service.constant;

import java.time.Duration;

public class RedisKeyTTL {
    public static final Duration RINGING_TTL = Duration.ofSeconds(60);
    public static final Duration ACTIVE_CALL_TTL = Duration.ofSeconds(3600);


    private RedisKeyTTL() {
    }
}
