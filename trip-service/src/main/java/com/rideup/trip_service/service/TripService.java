package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.request.CreateTripRequest;
import com.rideup.trip_service.dto.request.SeatReleaseRequest;
import com.rideup.trip_service.dto.request.SeatReserveRequest;
import com.rideup.trip_service.dto.request.TripStatusChangeRequest;
import com.rideup.trip_service.dto.response.*;
import com.rideup.trip_service.entity.Route;
import com.rideup.trip_service.entity.Trip;
import com.rideup.trip_service.entity.TripStop;
import com.rideup.trip_service.enums.TripStatus;
import com.rideup.trip_service.exception.AppException;
import com.rideup.trip_service.exception.ErrorCode;
import com.rideup.trip_service.feignClient.IdentityServiceClient;
import com.rideup.trip_service.repository.RouteRepository;
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

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripService {

    TripRepository tripRepository;
    ModelMapper modelMapper;
    IdentityServiceClient  identityServiceClient;
    RouteRepository routeRepository;

    @Transactional
    public TripResponse createTrip(CreateTripRequest request) {
        Route route = routeRepository.findById(request.getRouteId()).orElseThrow(() -> new AppException(ErrorCode.ROUTE_NOT_FOUND));
        UserResponse userResponse = identityServiceClient.getUserInfo().getResult();
        List<String> userIds = List.of(userResponse.getId());
        List<DriverResponse> driverResponses = identityServiceClient.getDriverDetail(userIds).getResult();
        Map<String, DriverResponse> driverMap =
                driverResponses.stream()
                        .collect(Collectors.toMap(
                                DriverResponse::getUserId,
                                Function.identity()
                        ));
        Trip trip = modelMapper.map(request, Trip.class);
        trip.setStops(null);
        trip.setDriverId(userResponse.getId());
        trip.setVehicleId(driverMap.get(userResponse.getId()).getVehicleId());
        trip.setRoute(route);
        trip.setStatus(TripStatus.STARTED);
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
        trip.setStatus(request.getStatus());
         return modelMapper.map(tripRepository.save(trip), TripResponse.class);
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

        Trip saved = tripRepository.save(trip);

        return modelMapper.map(saved, SeatResponse.class);
    }

    public void handleBookingConfirmed(String tripId, Integer seatCount, String bookingId, String correlationId) {
        log.info("Finalize hold from BookingConfirmedEvent bookingId={}, tripId={}, seatCount={}, correlationId={}",
                bookingId, tripId, seatCount, correlationId);
    }


    public PageResponse<TripResponse> getAllTrips(String startWardId,
                                                  String endWardId,
                                                  LocalDate date,
                                                  Pageable pageable) {

        Page<Trip> tripPage = tripRepository.getAllTrips(startWardId, endWardId, date, pageable);
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
}
