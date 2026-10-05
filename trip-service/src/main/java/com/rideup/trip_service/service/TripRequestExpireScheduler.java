package com.rideup.trip_service.service;

import com.rideup.trip_service.entity.TripRequest;
import com.rideup.trip_service.enums.TripRequestStatus;
import com.rideup.trip_service.repository.TripRequestRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripRequestExpireScheduler {

    TripRequestRepository tripRequestRepository;
    com.rideup.trip_service.repository.TripRequestInvitationRepository invitationRepository;
    com.rideup.trip_service.kafka.MarketplaceEventProducer marketplaceEventProducer;

    @Scheduled(cron = "0 */5 * * * *") // Run every 5 minutes
    @SchedulerLock(name = "TripRequestExpireScheduler_expireRequests", lockAtLeastFor = "2m", lockAtMostFor = "4m")
    @Transactional
    public void expireOldTripRequests() {
        log.info("Cronjob: Sweeping for expired trip requests...");
        LocalDateTime now = LocalDateTime.now();
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 100);
        int totalProcessed = 0;
        
        while (true) {
            org.springframework.data.domain.Page<TripRequest> expiredPage = tripRequestRepository
                    .findByStatusAndExpiresAtLessThanEqual(TripRequestStatus.OPEN, now, pageable);

            if (expiredPage.isEmpty()) {
                break;
            }
            
            List<TripRequest> expiredRequests = expiredPage.getContent();
            expiredRequests.forEach(req -> {
                req.setStatus(TripRequestStatus.EXPIRED);
                
                List<com.rideup.trip_service.entity.TripRequestInvitation> pendingInvitations = invitationRepository.findByTripRequestIdAndStatus(req.getId(), com.rideup.trip_service.enums.InvitationStatus.PENDING);
                pendingInvitations.forEach(inv -> inv.setStatus(com.rideup.trip_service.enums.InvitationStatus.EXPIRED));
                invitationRepository.saveAll(pendingInvitations);
                
                marketplaceEventProducer.publishTripRequestExpiredEvent(req.getId(), req.getPassengerId());
            });

            tripRequestRepository.saveAll(expiredRequests);
            totalProcessed += expiredRequests.size();
        }
        log.info("Cronjob: Expired {} trip requests", expiredRequests.size());
    }
}
