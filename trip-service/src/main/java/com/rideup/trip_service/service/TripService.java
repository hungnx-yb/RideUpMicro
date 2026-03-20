package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.request.CreateTripRequest;
import com.rideup.trip_service.dto.request.TripStatusChangeRequest;
import com.rideup.trip_service.dto.response.*;
import com.rideup.trip_service.entity.Route;
import com.rideup.trip_service.entity.Trip;
import com.rideup.trip_service.entity.TripStop;
import com.rideup.trip_service.exception.AppException;
import com.rideup.trip_service.exception.ErrorCode;
import com.rideup.trip_service.feignClient.IdentityServiceClient;
import com.rideup.trip_service.repository.RouteRepository;
import com.rideup.trip_service.repository.TripRepository;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
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
        Trip trip = findTrip(id);
        trip.setStatus(request.getStatus());
         return modelMapper.map(tripRepository.save(trip), TripResponse.class);
    }



    public TripResponse getDetail(String id) {
        Trip trip = findTrip(id);
        return modelMapper.map(trip, TripResponse.class);
    }

    private Trip findTrip(String id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROUTE_NOT_FOUND));
    }




}
