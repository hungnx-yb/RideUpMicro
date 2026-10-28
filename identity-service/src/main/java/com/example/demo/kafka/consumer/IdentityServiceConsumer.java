package com.example.demo.kafka.consumer;

import com.example.demo.entity.User;
import com.example.demo.exception.AppException;
import com.example.demo.exception.ErrorCode;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.demo.dto.event.DriverRatingUpdatedEvent;
import com.example.demo.entity.DriverProfile;
import com.example.demo.repository.DriverProfileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class IdentityServiceConsumer {

    DriverProfileRepository driverProfileRepository;
    ObjectMapper objectMapper;
    UserRepository userRepository;
    com.example.demo.service.CommissionService commissionService;

    @RetryableTopic(
            exclude = {JsonProcessingException.class, IllegalArgumentException.class}
    )
    @Transactional
    @KafkaListener(
            topics = "${app.kafka.topics.driver-rating-updated}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void consumeDriverRatingUpdated(String payload, Acknowledgment ack) {
        log.info("[Kafka] Received DriverRatingUpdatedEvent: {}", payload);
        try {
            DriverRatingUpdatedEvent event = objectMapper.readValue(payload, DriverRatingUpdatedEvent.class);
            User user = userRepository.findById(event.getDriverId()).orElseThrow(()->new AppException(ErrorCode.USER_NOT_EXISTED));
            DriverProfile driverProfile = user.getDriverProfile();

            if (driverProfile != null) {
                driverProfile.setDriverRating(event.getAverageRating());

                // Thưởng +1 điểm uy tín nếu đánh giá đạt 5 sao (tối đa 100)
                if (event.getAverageRating() >= 5.0) {
                    int currentRep = driverProfile.getReputationScore();
                    if (currentRep < 100) {
                        driverProfile.setReputationScore(currentRep + 1);
                        log.info("[Kafka][Reputation] Rewarded +1 reputation for 5-star rating to driver {}. New score: {}",
                                event.getDriverId(), driverProfile.getReputationScore());
                    }
                }

                driverProfileRepository.save(driverProfile);
                log.info("[Kafka] Updated driver rating to {} for driverId: {}",
                        event.getAverageRating(), event.getDriverId());
            } else {
                log.warn("[Kafka] DriverProfile not found for driverId: {}. Skipping.", event.getDriverId());
            }

            ack.acknowledge();

        } catch (JsonProcessingException e) {
            log.error("[Kafka][POISON-PILL] Cannot deserialize, sending to DLT. payload={}", payload, e);
            throw new IllegalArgumentException("Poison pill detected", e);
        } catch (Exception e) {
            log.error("[Kafka] Transient error, will retry via RetryableTopic.", e);
            throw e;
        }
    }

    @RetryableTopic(exclude = {JsonProcessingException.class, IllegalArgumentException.class})
    @Transactional
    @KafkaListener(
            topics = "${app.kafka.topics.booking-completed}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void consumeBookingCompleted(String payload, Acknowledgment ack) {
        log.info("[Kafka] Received BookingCompletedEvent: {}", payload);
        try {
            com.example.demo.dto.event.BookingCompletedEvent event = objectMapper.readValue(payload, com.example.demo.dto.event.BookingCompletedEvent.class);
            if (event.getDriverId() != null && event.getTotalAmount() != null) {
                User user = userRepository.findById(event.getDriverId()).orElse(null);
                if (user != null && user.getDriverProfile() != null) {
                    DriverProfile driverProfile = user.getDriverProfile();

                    // 1. Tính hoa hồng cá nhân hóa theo thời gian thực (12% - 25%)
                    java.math.BigDecimal dynamicRate = commissionService.calculateCommissionRate(driverProfile);
                    java.math.BigDecimal commission = event.getTotalAmount().multiply(dynamicRate)
                            .setScale(2, java.math.RoundingMode.HALF_UP);

                    // 2. Cộng công nợ hoa hồng cho tài xế
                    java.math.BigDecimal currentDebt = driverProfile.getSystemDebt() != null ? driverProfile.getSystemDebt() : java.math.BigDecimal.ZERO;
                    driverProfile.setSystemDebt(currentDebt.add(commission));

                    // 3. Tăng tổng số chuyến hoàn thành của tài xế
                    int currentRides = driverProfile.getTotalDriverRides() != null ? driverProfile.getTotalDriverRides() : 0;
                    driverProfile.setTotalDriverRides(currentRides + 1);

                    // 4. Thưởng +1 điểm uy tín khi hoàn thành chuyến đi (tối đa 100)
                    int currentRep = driverProfile.getReputationScore();
                    if (currentRep < 100) {
                        driverProfile.setReputationScore(currentRep + 1);
                    }

                    driverProfileRepository.save(driverProfile);
                    log.info("[Kafka][Commission] Applied dynamic rate {} (commission: {}) to driver {}. Total debt: {}, total rides: {}, reputation: {}",
                            dynamicRate, commission, event.getDriverId(), driverProfile.getSystemDebt(),
                            driverProfile.getTotalDriverRides(), driverProfile.getReputationScore());
                } else {
                    log.warn("[Kafka] DriverProfile not found for driverId: {}", event.getDriverId());
                }
            } else {
                log.warn("[Kafka] BookingCompletedEvent missing driverId or totalAmount. payload={}", payload);
            }
            ack.acknowledge();
        } catch (JsonProcessingException e) {
            log.error("[Kafka][POISON-PILL] Cannot deserialize BookingCompletedEvent, sending to DLT. payload={}", payload, e);
            throw new IllegalArgumentException("Poison pill detected", e);
        } catch (Exception e) {
            log.error("[Kafka] Transient error processing BookingCompletedEvent.", e);
            throw e;
        }
    }

    @DltHandler
    public void handleDlt(String payload, Exception ex) {
        log.error("[DLT] Message permanently failed after all retries. " +
                "MANUAL INTERVENTION REQUIRED! payload={}, error={}", payload, ex.getMessage());
    }
}
