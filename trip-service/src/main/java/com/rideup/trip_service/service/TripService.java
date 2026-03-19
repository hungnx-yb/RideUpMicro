package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.request.CreateTripRequest;
import com.rideup.trip_service.dto.request.TripStatusChangeRequest;
import com.rideup.trip_service.dto.request.TripStopRequest;
import com.rideup.trip_service.dto.response.*;
import com.rideup.trip_service.entity.Trip;
import com.rideup.trip_service.entity.TripStop;
import com.rideup.trip_service.exception.AppException;
import com.rideup.trip_service.exception.ErrorCode;
import com.rideup.trip_service.feignClient.IdentityServiceClient;
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

    @Transactional
    public TripResponse createTrip(CreateTripRequest request) {
        UserResponse userResponse = identityServiceClient.getUserInfo().getResult();
        List<String> userIds = List.of(userResponse.getId());
        List<DriverDetailProjection> driverDetailProjections = identityServiceClient.getDriverDetail(userIds).getResult();
        Map<String, DriverDetailProjection> driverMap =
                driverDetailProjections.stream()
                        .collect(Collectors.toMap(
                                DriverDetailProjection::getDriverId,
                                Function.identity()
                        ));
        Trip trip = modelMapper.map(request, Trip.class);
        trip.setDriverId(userResponse.getId());
        trip.setVehicleId(driverMap.get(userResponse.getId()).getVehicleId());

        if (request.getStops() != null && !request.getStops().isEmpty()) {
            List<TripStop> stops = request.getStops().stream()
                .map(stopReq -> modelMapper.map(stopReq, TripStop.class))
                .collect(Collectors.toList());
            trip.setStops(stops);
        }

        Trip saved = tripRepository.save(trip);
        return toResponse(saved);

    }



    @Transactional
    public TripResponse changeStatus(String id, TripStatusChangeRequest request) {
        Trip trip = findTrip(id);
        trip.setStatus(request.getStatus());
        return toResponse(tripRepository.save(trip));
    }



    public TripResponse getDetail(String id) {
        Trip trip = findTrip(id);
        return toResponse(trip);
    }

    private Trip findTrip(String id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROUTE_NOT_FOUND));
    }

    private TripStop toTripStop(TripStopRequest request, Trip trip) {
        TripStop stop = new TripStop();
        stop.setTrip(trip);
        stop.setStopType(request.getStopType());
        stop.setWardId(request.getWardId());
        stop.setAddressText(request.getAddressText());
        stop.setLat(request.getLat());
        stop.setLng(request.getLng());
        return stop;
    }

    private TripResponse toResponse(Trip trip) {
        List<TripStopResponse> stopResponses = null;
        if (trip.getStops() != null) {
            stopResponses = trip.getStops().stream()
                    .map(stop -> modelMapper.map(stop, TripStopResponse.class))
                    .toList();
        }
        TripResponse response = modelMapper.map(trip, TripResponse.class);
        response.setStops(stopResponses);
        return response;
    }


}
