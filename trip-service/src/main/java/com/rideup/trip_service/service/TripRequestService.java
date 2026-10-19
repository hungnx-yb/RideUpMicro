package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.event.TripRequestCancelEvent;
import com.rideup.trip_service.dto.request.MarketplaceTripRequestFilter;
import com.rideup.trip_service.dto.request.TripRequestCreate;
import com.rideup.trip_service.dto.request.TripRequestInvitationCreateDTO;
import com.rideup.trip_service.dto.response.DriverResponse;
import com.rideup.trip_service.dto.response.TripRequestInvitationResponse;
import com.rideup.trip_service.dto.response.TripRequestResponse;
import com.rideup.trip_service.dto.response.UserResponse;
import com.rideup.trip_service.dto.response.ProcessMarketplaceBookingResponse;
import com.rideup.trip_service.dto.request.SeatReserveRequest;
import com.rideup.trip_service.entity.Trip;
import com.rideup.trip_service.entity.TripRequest;
import com.rideup.trip_service.entity.TripRequestInvitation;
import com.rideup.trip_service.enums.InvitationStatus;
import com.rideup.trip_service.enums.TripRequestStatus;
import com.rideup.trip_service.exception.AppException;
import com.rideup.trip_service.exception.ErrorCode;
import com.rideup.trip_service.feignClient.IdentityServiceClient;
import com.rideup.trip_service.kafka.producer.MarketplaceEventProducer;
import com.rideup.trip_service.dto.event.InvitationRejectedEvent;
import com.rideup.trip_service.dto.event.TripRequestCreatedEvent;
import com.rideup.trip_service.dto.event.TripRequestInvitedEvent;
import com.rideup.trip_service.repository.TripRequestInvitationRepository;
import com.rideup.trip_service.repository.TripRequestRepository;
import com.rideup.trip_service.utils.SecurityUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripRequestService {
    TripRequestRepository tripRequestRepository;
    TripRequestInvitationRepository invitationRepository;
    IdentityServiceClient identityServiceClient;
    MarketplaceEventProducer marketplaceEventProducer;
    ModelMapper modelMapper;
    com.rideup.trip_service.repository.TripRepository tripRepository;
    TripService tripService;

    @Transactional
    public TripRequestResponse createTripRequest(TripRequestCreate request) {
        if (request.getDepartureTime().isBefore(LocalDateTime.now().plusMinutes(30))) {
            throw new AppException(ErrorCode.DEPARTURE_TIME_TOO_SOON);
        }
        if (request.getSeatTotal() == null || request.getSeatTotal() < 1 || request.getSeatTotal() > 10) {
            throw new AppException(ErrorCode.INVALID_SEAT_COUNT);
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime latestPossibleExpire = request.getDepartureTime().minusMinutes(15);
        LocalDateTime maxOpenTime = now.plusHours(12);
        if (maxOpenTime.isAfter(latestPossibleExpire)) {
            maxOpenTime = latestPossibleExpire;
        }
        LocalDateTime expiresAt = maxOpenTime;
        if (expiresAt.isBefore(now.plusMinutes(15))) {
            expiresAt = request.getDepartureTime().minusMinutes(5);
        }

        String userId = SecurityUtils.getCurrentUserId();
        TripRequest tripRequest = TripRequest.builder()
                .passengerId(userId)
                .startProvinceId(request.getStartProvinceId())
                .startWardId(request.getStartWardId())
                .endProvinceId(request.getEndProvinceId())
                .endWardId(request.getEndWardId())
                .startAddressText(request.getStartAddressText())
                .endAddressText(request.getEndAddressText())
                .departureTime(request.getDepartureTime())
                .seatTotal(request.getSeatTotal())
                .note(request.getNote())
                .status(TripRequestStatus.OPEN)
                .expiresAt(expiresAt)
                .build();

        tripRequest = tripRequestRepository.save(tripRequest);

        TripRequestCreatedEvent createdEvent = TripRequestCreatedEvent.builder()
                .tripRequestId(tripRequest.getId())
                .passengerId(tripRequest.getPassengerId())
                .startProvinceId(tripRequest.getStartProvinceId())
                .endProvinceId(tripRequest.getEndProvinceId())
                .seatTotal(tripRequest.getSeatTotal())
                .departureTime(tripRequest.getDepartureTime())
                .build();
        marketplaceEventProducer.publishTripRequestCreatedEvent(createdEvent);
        return modelMapper.map(tripRequest, TripRequestResponse.class);
    }

    @Transactional(readOnly = true)
    public List<TripRequestResponse> getMyTripRequests() {
        return getMyTripRequests(null);
    }

    @Transactional(readOnly = true)
    public List<TripRequestResponse> getMyTripRequests(TripRequestStatus status) {
        String userId = SecurityUtils.getCurrentUserId();
        List<TripRequest> requests = (status != null)
                ? tripRequestRepository.findByPassengerIdAndStatusOrderByCreatedAtDesc(userId, status)
                : tripRequestRepository.findByPassengerIdOrderByCreatedAtDesc(userId);

        UserResponse user = null;
        try {
            user = identityServiceClient.getUserInfo().getResult();
        } catch (Exception e) {
            log.warn("Could not fetch user info from identity-service: {}", e.getMessage());
        }

        final UserResponse finalUser = user;
        return requests.stream()
                .map(req -> mapToTripRequestResponse(req, finalUser))
                .toList();
    }

    public TripRequestResponse getTripRequestById(String id) {
        TripRequest tripRequest = tripRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_NOT_FOUND));

        UserResponse passenger = null;
        try {
            var usersResp = identityServiceClient.getUsersInfoByIds(List.of(tripRequest.getPassengerId()));
            if (usersResp != null && usersResp.getResult() != null && !usersResp.getResult().isEmpty()) {
                passenger = usersResp.getResult().get(0);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch passenger info for tripRequest {}", id, e);
        }

        TripRequestResponse response = mapToTripRequestResponse(tripRequest, passenger);
        long pendingCount = invitationRepository.countByTripRequestIdAndStatus(tripRequest.getId(), InvitationStatus.PENDING);
        response.setPendingInvitationCount((int) pendingCount);
        return response;
    }

    @Transactional
    public void cancelTripRequest(String id) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        TripRequest tripRequest = tripRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_NOT_FOUND));

        if (!tripRequest.getPassengerId().equals(currentUserId)) {
            throw new AppException(ErrorCode.NOT_YOUR_REQUEST);
        }

        if (tripRequest.getStatus() != TripRequestStatus.OPEN) {
            throw new AppException(ErrorCode.REQUEST_NOT_OPEN);
        }

        tripRequest.setStatus(TripRequestStatus.CANCELLED);
        tripRequest.setCancelledAt(java.time.LocalDateTime.now());
        tripRequest.setCancelReason("Passenger cancelled");
        tripRequestRepository.save(tripRequest);
        
        List<TripRequestInvitation> pendingInvitations = invitationRepository.findByTripRequestIdAndStatus(tripRequest.getId(), InvitationStatus.PENDING);
        pendingInvitations.forEach(inv -> {
            inv.setStatus(InvitationStatus.REJECTED);
            marketplaceEventProducer.publishInvitationRejectedEvent(InvitationRejectedEvent.builder()
                    .invitationId(inv.getId())
                    .tripRequestId(tripRequest.getId())
                    .driverId(inv.getDriverId())
                    .passengerId(tripRequest.getPassengerId())
                    .build());
        });
        invitationRepository.saveAll(pendingInvitations);
        
        marketplaceEventProducer.publishTripRequestCancelledEvent(TripRequestCancelEvent.builder()
                .tripRequestId(tripRequest.getId())
                .passengerId(tripRequest.getPassengerId())
                .build());
    }

    @Transactional
    public void cancelAllOpenRequests(String passengerId, String reason) {
        List<TripRequest> openRequests = tripRequestRepository.findByPassengerIdAndStatus(passengerId, TripRequestStatus.OPEN);
        for (TripRequest request : openRequests) {
            request.setStatus(TripRequestStatus.CANCELLED);
            request.setCancelledAt(java.time.LocalDateTime.now());
            request.setCancelReason(reason);
            tripRequestRepository.save(request);
            
            List<TripRequestInvitation> pendingInvitations = invitationRepository.findByTripRequestIdAndStatus(request.getId(), InvitationStatus.PENDING);
            pendingInvitations.forEach(inv -> {
                inv.setStatus(InvitationStatus.REJECTED);
                marketplaceEventProducer.publishInvitationRejectedEvent(InvitationRejectedEvent.builder()
                        .invitationId(inv.getId())
                        .tripRequestId(request.getId())
                        .driverId(inv.getDriverId())
                        .passengerId(passengerId)
                        .build());
            });
            invitationRepository.saveAll(pendingInvitations);
            marketplaceEventProducer.publishTripRequestCancelledEvent(TripRequestCancelEvent.builder()
                    .tripRequestId(request.getId())
                    .passengerId(passengerId)
                    .build());
        }
    }

    public TripRequestInvitationResponse getInvitation(String invitationId) {
        TripRequestInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND));
        TripRequestInvitationResponse response = modelMapper.map(invitation, TripRequestInvitationResponse.class);
        response.setPassengerId(invitation.getTripRequest().getPassengerId());
        response.setSeatCount(invitation.getTripRequest().getSeatTotal());
        return response;
    }

    @Transactional
    public void rejectInvitation(String invitationId) {
        UserResponse user = identityServiceClient.getUserInfo().getResult();
        TripRequestInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND));

        if (!invitation.getTripRequest().getPassengerId().equals(user.getId())) {
            throw new AppException(ErrorCode.NOT_YOUR_REQUEST);
        }

        invitation.setStatus(InvitationStatus.REJECTED);
        invitation.setRespondedAt(java.time.LocalDateTime.now());
        invitationRepository.save(invitation);
        
        marketplaceEventProducer.publishInvitationRejectedEvent(InvitationRejectedEvent.builder()
                .invitationId(invitation.getId())
                .tripRequestId(invitation.getTripRequest().getId())
                .driverId(invitation.getDriverId())
                .passengerId(invitation.getTripRequest().getPassengerId())
                .build());
    }

    @Transactional
    public void markInvitationAccepted(String invitationId) {
        TripRequestInvitation acceptedInv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND));

        if (acceptedInv.getStatus() != InvitationStatus.PENDING) {
            throw new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND); 
        }

        TripRequest tripRequest = acceptedInv.getTripRequest();
        if (tripRequest.getStatus() != TripRequestStatus.OPEN) {
            throw new AppException(ErrorCode.REQUEST_NOT_OPEN);
        }

        // Chốt TripRequest & Invitation chính
        tripRequest.setStatus(TripRequestStatus.ACCEPTED);
        acceptedInv.setStatus(InvitationStatus.ACCEPTED);
        acceptedInv.setRespondedAt(java.time.LocalDateTime.now());
        tripRequestRepository.save(tripRequest);
        invitationRepository.save(acceptedInv);

        // Reject tất cả invitation PENDING còn lại + bắn Kafka báo tài xế trượt
        List<TripRequestInvitation> others = invitationRepository
                .findByTripRequestIdAndStatus(tripRequest.getId(), InvitationStatus.PENDING)
                .stream()
                .filter(inv -> !inv.getId().equals(invitationId))
                .toList();
        others.forEach(inv -> {
            inv.setStatus(InvitationStatus.REJECTED);
            marketplaceEventProducer.publishInvitationRejectedEvent(InvitationRejectedEvent.builder()
                    .invitationId(inv.getId())
                    .tripRequestId(tripRequest.getId())
                    .driverId(inv.getDriverId())
                    .passengerId(tripRequest.getPassengerId())
                    .build());
        });
        invitationRepository.saveAll(others);
        
        log.info("TripRequest {} accepted invitation {} from driver {}", tripRequest.getId(), acceptedInv.getId(), acceptedInv.getDriverId());
    }

    @Transactional
    public ProcessMarketplaceBookingResponse validateAndReserveSeats(String invitationId, String passengerId) {
        TripRequestInvitation acceptedInv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND));

        if (!acceptedInv.getTripRequest().getPassengerId().equals(passengerId)) {
            throw new AppException(ErrorCode.NOT_YOUR_REQUEST);
        }

        if (acceptedInv.getStatus() != InvitationStatus.PENDING) {
            throw new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND); 
        }

        TripRequest tripRequest = acceptedInv.getTripRequest();
        if (tripRequest.getStatus() != TripRequestStatus.OPEN) {
            throw new AppException(ErrorCode.REQUEST_NOT_OPEN);
        }

        var seatResponse = tripService.reserveSeats(
            SeatReserveRequest.builder()
                .tripId(acceptedInv.getTripId())
                .seatCount(tripRequest.getSeatTotal())
                .build()
        );
        
        log.info("TripRequest {} validated and seats reserved for invitation {}.", tripRequest.getId(), acceptedInv.getId());

        return ProcessMarketplaceBookingResponse.builder()
                .tripId(acceptedInv.getTripId())
                .seatCount(tripRequest.getSeatTotal())
                .priceVnd(seatResponse.getPriceVnd())
                .passengerId(tripRequest.getPassengerId())
                .build();
    }

    // ----- DRIVER APIs -----

    public Page<TripRequestResponse> getOpenRequestsInMarketplace(MarketplaceTripRequestFilter filter, Pageable pageable) {
        return tripRequestRepository.getMarketplaceRequests(filter, pageable)
                .map(req -> mapToTripRequestResponse(req, null));
    }

    @Transactional
    public TripRequestInvitationResponse sendInvitation(TripRequestInvitationCreateDTO request) {
        UserResponse driver = identityServiceClient.getUserInfo().getResult();
        TripRequest tripRequest = tripRequestRepository.findById(request.getTripRequestId())
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_NOT_FOUND));


        Trip trip = tripRepository.findById(request.getTripId())
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));
                
        if (!trip.getDriverId().equals(driver.getId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (trip.getSeatAvailable() < tripRequest.getSeatTotal()) {
            throw new AppException(ErrorCode.SEAT_NOT_AVAILABLE);
        }

        if (invitationRepository.existsByTripRequestIdAndTripId(tripRequest.getId(), request.getTripId())) {
            throw new AppException(ErrorCode.INVITATION_ALREADY_SENT);
        }
        
        long pendingCount = invitationRepository.countByTripRequestIdAndStatus(tripRequest.getId(), InvitationStatus.PENDING);
        if (pendingCount >= 5) {
            throw new AppException(ErrorCode.TOO_MANY_PENDING_INVITATIONS);
        }

        TripRequestInvitation invitation = TripRequestInvitation.builder()
                .tripRequest(tripRequest)
                .driverId(driver.getId())
                .tripId(trip.getId())
                .message(request.getMessage())
                .status(InvitationStatus.PENDING)
                .build();

        invitation = invitationRepository.save(invitation);
        
        marketplaceEventProducer.publishTripRequestInvitedEvent(TripRequestInvitedEvent.builder()
                .invitationId(invitation.getId())
                .tripRequestId(tripRequest.getId())
                .driverId(driver.getId())
                .passengerId(tripRequest.getPassengerId())
                .tripId(trip.getId())
                .build());
        
        TripRequestInvitationResponse response = modelMapper.map(invitation, TripRequestInvitationResponse.class);
        response.setTripRequestId(tripRequest.getId());
        return response;
    }

    private TripRequestResponse mapToTripRequestResponse(TripRequest request, UserResponse passenger) {
        TripRequestResponse response = modelMapper.map(request, TripRequestResponse.class);
        if (passenger != null) {
            response.setPassenger(passenger);
        }

        if (request.getInvitations() != null && !request.getInvitations().isEmpty()) {
            List<TripRequestInvitationResponse> invResponses = request.getInvitations().stream()
                    .map(inv -> {
                        TripRequestInvitationResponse invResp = modelMapper.map(inv, TripRequestInvitationResponse.class);
                        invResp.setTripRequestId(request.getId());
                        try {
                            tripRepository.findById(inv.getTripId()).ifPresent(trip -> {
                                if (trip.getPriceVnd() != null && request.getSeatTotal() != null) {
                                    invResp.setPrice(trip.getPriceVnd().multiply(BigDecimal.valueOf(request.getSeatTotal())));
                                } else if (trip.getPriceVnd() != null) {
                                    invResp.setPrice(trip.getPriceVnd());
                                }
                            });
                        } catch (Exception e) {
                            log.warn("Failed to get trip price for invitation {}", inv.getId(), e);
                        }
                        return invResp;
                    })
                    .toList();

            List<String> driverIds = invResponses.stream()
                    .map(TripRequestInvitationResponse::getDriverId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();

            if (!driverIds.isEmpty()) {
                try {
                    var driverResp = identityServiceClient.getDriverDetail(driverIds);
                    if (driverResp != null && driverResp.getResult() != null) {
                        Map<String, DriverResponse> driverMap = driverResp.getResult().stream()
                                .collect(Collectors.toMap(DriverResponse::getUserId, d -> d, (d1, d2) -> d1));

                        for (TripRequestInvitationResponse invResp : invResponses) {
                            DriverResponse d = driverMap.get(invResp.getDriverId());
                            if (d != null) {
                                invResp.setDriver(d);
                                invResp.setDriverName(d.getFullName());
                                invResp.setDriverAvatar(d.getAvatarUrl());
                                invResp.setDriverRating(d.getDriverRating());
                                if (d.getVehicleBrand() != null) {
                                    invResp.setVehicleInfo(d.getVehicleBrand() + (d.getVehicleModel() != null ? " " + d.getVehicleModel() : ""));
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch driver details for invitations: {}", e.getMessage());
                }
            }
            response.setInvitations(invResponses);
        } else {
            response.setInvitations(Collections.emptyList());
        }

        return response;
    }
}
