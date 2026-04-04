package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.request.IdempotencyRecord;
import com.rideUp.booking_service.enums.IdempotencyRecordStatus;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class IdempotencyService {

    RedisTemplate<String, Object> redisTemplate;

    static Duration PROCESSING_TTL = Duration.ofMinutes(5);
    static Duration SUCCESS_TTL = Duration.ofMinutes(30);

    public boolean tryCreateProcessing(String key, String requestHash) {

        IdempotencyRecord record = IdempotencyRecord.builder()
                .status(IdempotencyRecordStatus.PROCESSING.toString())
                .requestHash(requestHash)
                .createdAt(System.currentTimeMillis())
                .build();
//        chi set key neu chua ton tai
        Boolean success = redisTemplate.opsForValue()
                .setIfAbsent(key, record, PROCESSING_TTL);

        return Boolean.TRUE.equals(success);
    }

    public IdempotencyRecord get(String key) {
        return (IdempotencyRecord) redisTemplate.opsForValue().get(key);
    }

    public void saveSuccess(String key, IdempotencyRecord record) {

        record.setStatus(IdempotencyRecordStatus.SUCCESS.toString());

        redisTemplate.opsForValue()
                .set(key, record, SUCCESS_TTL);
    }

    public void delete(String key) {
        redisTemplate.delete(key);
    }
}
