package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.event.DriverReputationPenaltyEvent;
import com.rideup.trip_service.dto.event.TripCancelledEvent;
import com.rideup.trip_service.dto.event.TripCompletedEvent;
import com.rideup.trip_service.entity.Trip;
import com.rideup.trip_service.enums.TripStatus;
import com.rideup.trip_service.kafka.producer.TripServicePublisher;
import com.rideup.trip_service.repository.TripRepository;
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
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripLifecycleScheduler {

    static final int PENALTY_UNSTARTED_TRIP_WITH_PASSENGERS = 5;
    static final int PENALTY_UNCOMPLETED_TRIP = 2;

    TripRepository tripRepository;
    TripServicePublisher tripServicePublisher;
    MarketplaceTimeoutReader timeoutReader;
    TripRequestService tripRequestService;

    /**
     * Quét định kỳ mỗi 1 phút:
     * 1. Hủy chuyến nếu quá hạn sau giờ khởi hành theo cấu hình SLA của Admin mà tài xế chưa bấm Bắt đầu (OPEN/FULL -> CANCELED).
     * 2. Tự động hoàn thành chuyến nếu quá hạn sau thời gian đến dự kiến theo cấu hình SLA của Admin mà tài xế chưa bấm Hoàn thành (STARTED -> COMPLETED).
     */
    @Scheduled(cron = "0 */1 * * * *")
    @SchedulerLock(name = "TripLifecycleScheduler_sweepTripLifecycle", lockAtLeastFor = "20s", lockAtMostFor = "50s")
    @Transactional
    public void sweepTripLifecycle() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Quá hạn sau giờ khởi hành: Tự động hủy chuyến, hoàn tiền cho khách
        cancelUnstartedTrips(now);

        // 2. Quá hạn sau giờ đến dự kiến: Tự động hoàn thành chuyến và quyết toán tiền
        autoCompleteFinishedTrips(now);
    }

    private void cancelUnstartedTrips(LocalDateTime now) {
        int cancelMinutes = timeoutReader.getTripUnstartedAutoCancelMinutes();
        LocalDateTime unstartedCutoff = now.minusMinutes(cancelMinutes);
        List<Trip> unstartedTrips = tripRepository.findByStatusInAndDepartureTimeLessThanEqual(
                List.of(TripStatus.OPEN, TripStatus.FULL),
                unstartedCutoff
        );

        if (!unstartedTrips.isEmpty()) {
            log.info("[TripLifecycleScheduler] Found {} unstarted trips past {} minutes from departureTime to cancel",
                    unstartedTrips.size(), cancelMinutes);
            for (Trip trip : unstartedTrips) {
                try {
                    trip.setStatus(TripStatus.CANCELED);
                    trip.setCancelReason("Tự động hủy chuyến: Quá " + cancelMinutes + " phút sau giờ khởi hành mà tài xế không bắt đầu chuyến");
                    trip.setCancelledAt(now);
                    tripRepository.save(trip);

                    TripCancelledEvent event = TripCancelledEvent.builder()
                            .eventId(UUID.randomUUID().toString())
                            .correlationId(UUID.randomUUID().toString())
                            .tripId(trip.getId())
                            .driverId(trip.getDriverId())
                            .cancelReason(trip.getCancelReason())
                            .cancelledAt(trip.getCancelledAt())
                            .build();
                    tripServicePublisher.publishTripCancelled(event);
                    tripRequestService.rejectPendingInvitationsByTrip(trip.getId());

                    boolean hasPassengers = trip.getSeatAvailable() != null
                            && trip.getSeatTotal() != null
                            && trip.getSeatAvailable() < trip.getSeatTotal();
                    if (hasPassengers) {
                        publishPenalty(trip, PENALTY_UNSTARTED_TRIP_WITH_PASSENGERS, trip.getCancelReason());
                    }
                    log.info("[TripLifecycleScheduler] Auto-cancelled tripId={} due to no-start after {} minutes from departureTime={}",
                            trip.getId(), cancelMinutes, trip.getDepartureTime());
                } catch (Exception ex) {
                    log.error("[TripLifecycleScheduler] Failed to auto-cancel tripId={}: {}", trip.getId(), ex.getMessage(), ex);
                }
            }
        }
    }

    private void autoCompleteFinishedTrips(LocalDateTime now) {
        int completeMinutes = timeoutReader.getTripAutoCompleteMinutes();
        LocalDateTime arrivalCutoff = now.minusMinutes(completeMinutes);
        LocalDateTime departureFallbackCutoff = now.minusMinutes(completeMinutes);

        List<Trip> tripsToComplete = tripRepository.findStartedTripsToComplete(arrivalCutoff, departureFallbackCutoff);

        if (!tripsToComplete.isEmpty()) {
            log.info("[TripLifecycleScheduler] Found {} started trips past {} minutes from estimatedArrivalTime to auto-complete",
                    tripsToComplete.size(), completeMinutes);
            for (Trip trip : tripsToComplete) {
                try {
                    trip.setStatus(TripStatus.COMPLETED);
                    tripRepository.save(trip);

                    TripCompletedEvent event = TripCompletedEvent.builder()
                            .eventId(UUID.randomUUID().toString())
                            .correlationId(UUID.randomUUID().toString())
                            .tripId(trip.getId())
                            .driverId(trip.getDriverId())
                            .completedAt(now)
                            .build();
                    tripServicePublisher.publishTripCompleted(event);
                    publishPenalty(trip, PENALTY_UNCOMPLETED_TRIP, "Tự động hoàn thành chuyến do tài xế không bấm hoàn thành đúng hạn");
                    log.info("[TripLifecycleScheduler] Auto-completed tripId={} past {} minutes from estimatedArrivalTime={}",
                            trip.getId(), completeMinutes, trip.getEstimatedArrivalTime());
                } catch (Exception ex) {
                    log.error("[TripLifecycleScheduler] Failed to auto-complete tripId={}: {}", trip.getId(), ex.getMessage(), ex);
                }
            }
        }
    }

    private void publishPenalty(Trip trip, int penaltyPoints, String reason) {
        if (trip.getDriverId() == null) {
            return;
        }
        tripServicePublisher.publishDriverReputationPenalty(DriverReputationPenaltyEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(UUID.randomUUID().toString())
                .driverId(trip.getDriverId())
                .tripId(trip.getId())
                .penaltyPoints(penaltyPoints)
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build());
    }
}
