package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.event.TripRequestCancelEvent;
import com.rideup.trip_service.dto.request.MarketplaceTripRequestFilter;
import com.rideup.trip_service.dto.request.TripRequestCreate;
import com.rideup.trip_service.dto.request.TripRequestInvitationCreateDTO;
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

import java.time.LocalDateTime;
import java.util.List;

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
        java.time.LocalDateTime expiresAt = request.getDepartureTime().minusMinutes(60);
        if (java.time.LocalDateTime.now().plusMinutes(60).isBefore(expiresAt)) {
            expiresAt = java.time.LocalDateTime.now().plusMinutes(60);
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
        marketplaceEventProducer.publishTripRequestCreatedEvent(modelMapper.map(tripRequest, TripRequestCreatedEvent.class));
        return modelMapper.map(tripRequest, TripRequestResponse.class);
    }

    public List<TripRequestResponse> getMyTripRequests() {
        UserResponse user = identityServiceClient.getUserInfo().getResult();
        return tripRequestRepository.findByPassengerIdAndStatus(user.getId(), TripRequestStatus.OPEN)
                .stream()
                .map(req -> mapToTripRequestResponse(req, user))
                .toList();
    }

    @Transactional
    public void cancelTripRequest(String id) {
        UserResponse user = identityServiceClient.getUserInfo().getResult();
        TripRequest tripRequest = tripRequestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_NOT_FOUND));

        if (!tripRequest.getPassengerId().equals(user.getId())) {
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
                    .passengerId(user.getId())
                    .build());
        });
        invitationRepository.saveAll(pendingInvitations);
        
        marketplaceEventProducer.publishTripRequestCancelledEvent(modelMapper.map(tripRequest, TripRequestCancelEvent.class));
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
            marketplaceEventProducer.publishTripRequestCancelledEvent(modelMapper.map(request, TripRequestCancelEvent.class));
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

        if (tripRequest.getStatus() != TripRequestStatus.OPEN) {
            throw new AppException(ErrorCode.REQUEST_NOT_OPEN);
        }
        
        if (tripRequest.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            throw new AppException(ErrorCode.TRIP_REQUEST_EXPIRED);
        }

        Trip trip = tripRepository.findById(request.getTripId())
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));
                
        if (!trip.getDriverId().equals(driver.getId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        
        if (trip.getStatus() != com.rideup.trip_service.enums.TripStatus.STARTED) {
            throw new AppException(ErrorCode.TRIP_NOT_AVAILABLE);
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
        } else {
            // Can fetch passenger info from identity-service via Feign if needed for the marketplace view
            // e.g. UserResponse p = identityServiceClient.getUserInfoById(request.getPassengerId()).getResult();
            // response.setPassenger(p);
        }
        return response;
    }
}
