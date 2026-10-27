package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.request.*;
import com.rideup.trip_service.dto.response.*;
import com.rideup.trip_service.entity.Trip;
import com.rideup.trip_service.entity.TripStop;
import com.rideup.trip_service.enums.TripStatus;
import com.rideup.trip_service.exception.AppException;
import com.rideup.trip_service.exception.ErrorCode;
import com.rideup.trip_service.feignClient.IdentityServiceClient;
import com.rideup.trip_service.repository.TripRepository;
import jakarta.persistence.OptimisticLockException;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;

import com.rideup.trip_service.dto.event.TripCancelledEvent;
import com.rideup.trip_service.kafka.producer.TripServicePublisher;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripService {

    TripRepository tripRepository;
    ModelMapper modelMapper;
    IdentityServiceClient  identityServiceClient;
    TripServicePublisher tripServicePublisher;

    @Transactional
    public TripResponse createTrip(CreateTripRequest request) {
        // Kiểm tra nợ của tài xế (Khóa cứng tại Backend)
        try {
            var debtResponse = identityServiceClient.getMyWallet();
            if (debtResponse != null && debtResponse.getResult() != null) {
                java.math.BigDecimal currentDebt = debtResponse.getResult();
                if (currentDebt.compareTo(new java.math.BigDecimal("500000")) >= 0) {
                    throw new AppException(ErrorCode.ACCOUNT_BLOCKED_DUE_TO_DEBT);
                }
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to check wallet debt: {}", e.getMessage());
        }

        UserResponse userResponse = identityServiceClient.getUserInfo().getResult();
        List<String> userIds = List.of(userResponse.getId());
        List<DriverResponse> driverResponses = identityServiceClient.getDriverDetail(userIds).getResult();
        Map<String, DriverResponse> driverMap =
                driverResponses.stream()
                        .collect(Collectors.toMap(
                                DriverResponse::getUserId,
                                Function.identity()
                        ));
        DriverResponse driver = driverMap.get(userResponse.getId());
        if (driver != null && driver.getSeatCapacity() != null && request.getSeatTotal() != null) {
            if (request.getSeatTotal() > driver.getSeatCapacity()) {
                throw new AppException(ErrorCode.SEAT_EXCEEDS_CAPACITY);
            }
        }

        Trip trip = modelMapper.map(request, Trip.class);
        trip.setStops(null);
        trip.setDriverId(userResponse.getId());
        trip.setVehicleId(driver != null ? driver.getVehicleId() : null);
        trip.setStatus(TripStatus.OPEN);
        trip.setSeatAvailable(request.getSeatTotal());


        if (request.getStops() != null && !request.getStops().isEmpty()) {
            request.getStops().forEach(stopReq -> {
                TripStop stop = modelMapper.map(stopReq, TripStop.class);
                trip.addStop(stop);
            });
        }

        Trip saved = tripRepository.save(trip);
        return modelMapper.map(saved, TripResponse.class);
    }

    @Transactional
    public TripResponse changeStatus(String id, TripStatusChangeRequest request) {
        Trip trip = tripRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));

        if (request.getStatus() == TripStatus.CANCELED) {
            if (trip.getStatus() == TripStatus.STARTED) {
                throw new AppException(ErrorCode.CANNOT_CANCEL_STARTED_TRIP);
            }
            if (trip.getStatus() == TripStatus.COMPLETED) {
                throw new AppException(ErrorCode.CANNOT_CANCEL_STARTED_TRIP);
            }
            trip.setStatus(TripStatus.CANCELED);
            trip.setCancelReason(request.getCancelReason() != null && !request.getCancelReason().isBlank()
                    ? request.getCancelReason() : "Tài xế huỷ chuyến");
            trip.setCancelledAt(LocalDateTime.now());
            Trip saved = tripRepository.save(trip);

            // Bắn Kafka Event sang booking-service để huỷ vé và hoàn tiền tự động cho khách
            TripCancelledEvent event = TripCancelledEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .correlationId(UUID.randomUUID().toString())
                    .tripId(saved.getId())
                    .driverId(saved.getDriverId())
                    .cancelReason(saved.getCancelReason())
                    .cancelledAt(saved.getCancelledAt())
                    .build();
            tripServicePublisher.publishTripCancelled(event);

            return modelMapper.map(saved, TripResponse.class);
        }

        // Chặn bắt đầu chuyến khi chưa có khách (seatAvailable == seatTotal => chưa có ai đặt)
        if (request.getStatus() == TripStatus.STARTED) {
            if (trip.getSeatAvailable() != null && trip.getSeatTotal() != null
                    && trip.getSeatAvailable().equals(trip.getSeatTotal())) {
                throw new AppException(ErrorCode.CANNOT_START_WITHOUT_PASSENGERS);
            }
        }

        trip.setStatus(request.getStatus());
        Trip saved = tripRepository.save(trip);

        if (request.getStatus() == TripStatus.COMPLETED) {
            com.rideup.trip_service.dto.event.TripCompletedEvent completedEvent = com.rideup.trip_service.dto.event.TripCompletedEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .correlationId(UUID.randomUUID().toString())
                    .tripId(saved.getId())
                    .driverId(saved.getDriverId())
                    .completedAt(LocalDateTime.now())
                    .build();
            tripServicePublisher.publishTripCompleted(completedEvent);
        }

        return modelMapper.map(saved, TripResponse.class);
    }

    public TripResponse getDetail(String id) {
        Trip trip = tripRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));
        return modelMapper.map(trip, TripResponse.class);
    }


    @Transactional
    public SeatResponse reserveSeats(SeatReserveRequest request) {
        int maxRetry = 3;
        for (int i = 0; i < maxRetry; i++) {
            try {
                Trip trip = tripRepository.findById(request.getTripId()).orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));
                if (request.getSeatCount() == null || request.getSeatCount() <= 0) {
                    throw new AppException(ErrorCode.INVALID_SEAT_COUNT);
                }

                if (trip.getSeatAvailable() == null || trip.getSeatAvailable() < request.getSeatCount()) {
                    throw new AppException(ErrorCode.SEAT_NOT_AVAILABLE);
                }

                trip.setSeatAvailable(trip.getSeatAvailable() - request.getSeatCount());
                if (trip.getSeatAvailable() == 0 && trip.getStatus() == com.rideup.trip_service.enums.TripStatus.OPEN) {
                    trip.setStatus(com.rideup.trip_service.enums.TripStatus.FULL);
                }

                Trip saved = tripRepository.save(trip);

                return modelMapper.map(saved, SeatResponse.class);

            } catch (OptimisticLockException | ObjectOptimisticLockingFailureException e) {
                if (i < maxRetry - 1) {
                    try {
                        Thread.sleep(50);
                    } catch (InterruptedException ex) {
                        Thread.currentThread().interrupt();
                    }
                }

                if (i == maxRetry - 1) {
                    throw new AppException(ErrorCode.VERSION_CONFLICT);
                }
            }
        }
        throw new AppException(ErrorCode.VERSION_CONFLICT);
    }

    @Transactional
    public SeatResponse releaseSeats(SeatReleaseRequest request) {
        Trip trip = tripRepository.findById(request.getTripId()).orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));
        if (request.getSeatCount() == null || request.getSeatCount() <= 0) {
            throw new AppException(ErrorCode.INVALID_SEAT_COUNT);
        }

        int newAvailable = trip.getSeatAvailable() + request.getSeatCount();
        trip.setSeatAvailable(Math.min(newAvailable, trip.getSeatTotal()));

        if (trip.getStatus() == com.rideup.trip_service.enums.TripStatus.FULL && trip.getSeatAvailable() > 0) {
            trip.setStatus(com.rideup.trip_service.enums.TripStatus.OPEN);
        }

        Trip saved = tripRepository.save(trip);

        return modelMapper.map(saved, SeatResponse.class);
    }

    public PageResponse<TripResponse> getAllTrips(String startProvinceId,
                                                  String startWardId,
                                                  String endProvinceId,
                                                  String endWardId,
                                                  LocalDate date,
                                                  Pageable pageable) {

        Page<Trip> tripPage = tripRepository.getAllTrips(startProvinceId, startWardId, endProvinceId, endWardId, date, pageable);
        List<Trip> trips = tripPage.getContent();

        List<String> ids = trips.stream()
                .map(Trip::getDriverId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<DriverResponse> driverResponses = identityServiceClient
                .getDriverDetail(ids)
                .getResult();

        Map<String, DriverResponse> mapDriver = driverResponses.stream()
                .collect(Collectors.toMap(
                        DriverResponse::getUserId,
                        Function.identity(),
                        (a, b) -> a
                ));

        List<TripResponse> tripResponses = trips.stream()
                .map(trip -> {
                    TripResponse response = modelMapper.map(trip, TripResponse.class);

                    DriverResponse driver = mapDriver.get(trip.getDriverId());
                    if (driver != null) {
                        response.setDriverName(driver.getFullName());
                        response.setDriverPhone(driver.getPhoneNumber());
                        response.setDriverEmail(driver.getEmail());
                        response.setAvatarUrl(driver.getAvatarUrl());
                        response.setDriverRating(driver.getDriverRating());
                        response.setVehicleImage(driver.getVehicleImage());
                        response.setVehicleModel(driver.getVehicleModel());
                        response.setVehicleBrand(driver.getVehicleBrand());
                    }

                    return response;
                })
                .toList();

        PageResponse.Meta meta = PageResponse.Meta.builder()
                .page(tripPage.getNumber())
                .size(tripPage.getSize())
                .totalElements(tripPage.getTotalElements())
                .totalPages(tripPage.getTotalPages())
                .build();

        PageResponse<TripResponse> pageResponse = new PageResponse<>();
        pageResponse.setItems(tripResponses);
        pageResponse.setMeta(meta);

        return pageResponse;
    }


    public Page<TripResponse> searchDriveTrip(SearchTripDriveRequest request) {
        Page<Trip> page = tripRepository.searchDriveTrip(request);
        return page.map(trip -> modelMapper.map(trip, TripResponse.class));
    }
}
