package com.example.demo.service;

import com.example.demo.dto.response.driver.CommissionConfigResponse;
import com.example.demo.entity.DriverProfile;
import com.example.demo.enums.DriverStatus;
import com.example.demo.repository.DriverProfileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Job định kỳ phục hồi điểm uy tín cho tài xế bị dưới ngưỡng tối thiểu (minAcceptScore),
 * giúp tài xế từng bị khóa nhận chuyến có cơ hội quay lại hoạt động (+1 điểm mỗi lần chạy).
 */
@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverReputationRecoveryScheduler {

    static final int MAX_REPUTATION_SCORE = 100;

    DriverProfileRepository driverProfileRepository;
    CommissionService commissionService;

    @Scheduled(cron = "${app.reputation.recovery-cron:0 0 0 * * *}")
    @Transactional
    public void recoverLowReputationDrivers() {
        CommissionConfigResponse config = commissionService.getCommissionConfig();
        int threshold = config.getMinAcceptScore() != null
                ? config.getMinAcceptScore()
                : CommissionService.DEFAULT_MIN_ACCEPT_SCORE;

        if (threshold <= 0) {
            return;
        }

        List<DriverProfile> lowRepDrivers = driverProfileRepository
                .findByStatusAndReputationScoreLessThan(DriverStatus.APPROVED, threshold);

        if (lowRepDrivers.isEmpty()) {
            return;
        }

        for (DriverProfile profile : lowRepDrivers) {
            int current = profile.getReputationScore();
            int next = Math.min(MAX_REPUTATION_SCORE, current + 1);
            profile.setReputationScore(next);
        }

        driverProfileRepository.saveAll(lowRepDrivers);
        log.info("[DriverReputationRecovery] Added +1 reputation point for {} APPROVED drivers below threshold={}",
                lowRepDrivers.size(), threshold);
    }
}
