package com.rideup.chat_service.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.chat_service.constant.RedisPrefixKeyConstant;
import com.rideup.chat_service.model.CallSession;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallStateStore {
    RedisTemplate<String, Object> redisTemplate;
    ObjectMapper objectMapper;
    public CallSession getState(String callId) {
        Object value = redisTemplate.opsForValue().get(callStateKey(callId));
        if (value instanceof CallSession state) {
            return state;
        }
        if (value instanceof Map<?, ?> map) {
            return objectMapper.convertValue(map, CallSession.class);
        }
        return null;
    }

    public void saveState(CallSession state, Duration ttl) {
        redisTemplate.opsForValue().set(callStateKey(state.getId()), state, ttl);
    }

    public void deleteState(String callId) {
        redisTemplate.delete(callStateKey(callId));
    }

    public String getActiveCallId(String userId) {
        Object value = redisTemplate.opsForValue().get(activeUserKey(userId));
        return value == null ? null : value.toString();
    }

    public void setActiveCallId(String userId, String callId, Duration ttl) {
        redisTemplate.opsForValue().set(activeUserKey(userId), callId, ttl);
    }

    public void clearActiveCallId(String userId, String callId) {
        String key = activeUserKey(userId);
        Object value = redisTemplate.opsForValue().get(key);
        if (value != null && value.toString().equals(callId)) {
            redisTemplate.delete(key);
        }
    }

    private String callStateKey(String callId) {
        return RedisPrefixKeyConstant.CALL_STATE + callId;
    }

    private String activeUserKey(String userId)
    {
        return RedisPrefixKeyConstant.CALL_ACTIVE_USER + userId;
    }
}
