package com.rideup.trip_service.service;

import com.rideup.trip_service.dto.request.TripRequestCreateDTO;
import com.rideup.trip_service.dto.request.TripRequestInvitationCreateDTO;
import com.rideup.trip_service.dto.response.TripRequestInvitationResponse;
import com.rideup.trip_service.dto.response.TripRequestResponse;
import com.rideup.trip_service.dto.response.UserResponse;
import com.rideup.trip_service.entity.TripRequest;
import com.rideup.trip_service.entity.TripRequestInvitation;
import com.rideup.trip_service.enums.InvitationStatus;
import com.rideup.trip_service.enums.TripRequestStatus;
import com.rideup.trip_service.exception.AppException;
import com.rideup.trip_service.exception.ErrorCode;
import com.rideup.trip_service.feignClient.IdentityServiceClient;
import com.rideup.trip_service.kafka.MarketplaceEventProducer;
import com.rideup.trip_service.repository.TripRequestInvitationRepository;
import com.rideup.trip_service.repository.TripRequestRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // ----- PASSENGER APIs -----
    
    @Transactional
    public TripRequestResponse createTripRequest(TripRequestCreateDTO request) {
        if (request.getDepartureTime().isBefore(java.time.LocalDateTime.now().plusMinutes(30))) {
            throw new AppException(ErrorCode.DEPARTURE_TIME_TOO_SOON);
        }
        
        if (request.getSeatTotal() == null || request.getSeatTotal() < 1 || request.getSeatTotal() > 10) {
            throw new AppException(ErrorCode.INVALID_SEAT_COUNT);
        }

        UserResponse user = identityServiceClient.getUserInfo().getResult();
        
        boolean hasDuplicate = tripRequestRepository.existsByPassengerIdAndStartProvinceIdAndEndProvinceIdAndDepartureTimeAndStatus(
                user.getId(), request.getStartProvinceId(), request.getEndProvinceId(), request.getDepartureTime(), TripRequestStatus.OPEN
        );
        if (hasDuplicate) {
            throw new AppException(ErrorCode.DUPLICATE_TRIP_REQUEST);
        }

        java.time.LocalDateTime expiresAt = request.getDepartureTime().minusMinutes(60);
        if (java.time.LocalDateTime.now().plusMinutes(60).isBefore(expiresAt)) {
            expiresAt = java.time.LocalDateTime.now().plusMinutes(60);
        }

        TripRequest tripRequest = TripRequest.builder()
                .passengerId(user.getId())
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
        
        marketplaceEventProducer.publishTripRequestCreatedEvent(
                tripRequest.getId(),
                user.getId(),
                tripRequest.getStartProvinceId(),
                tripRequest.getEndProvinceId(),
                tripRequest.getSeatTotal(),
                tripRequest.getDepartureTime()
        );
        
        return mapToTripRequestResponse(tripRequest, user);
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
            marketplaceEventProducer.publishInvitationRejectedEvent(
                    inv.getId(),
                    tripRequest.getId(),
                    inv.getDriverId(),
                    user.getId()
            );
        });
        invitationRepository.saveAll(pendingInvitations);
        
        marketplaceEventProducer.publishTripRequestCancelledEvent(tripRequest.getId(), user.getId());
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
                marketplaceEventProducer.publishInvitationRejectedEvent(
                        inv.getId(),
                        request.getId(),
                        inv.getDriverId(),
                        passengerId
                );
            });
            invitationRepository.saveAll(pendingInvitations);
            
            marketplaceEventProducer.publishTripRequestCancelledEvent(request.getId(), passengerId);
        }
    }

    public TripRequestInvitationResponse getInvitation(String invitationId) {
        TripRequestInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND));
        return modelMapper.map(invitation, TripRequestInvitationResponse.class);
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
        
        marketplaceEventProducer.publishInvitationRejectedEvent(
                invitation.getId(),
                invitation.getTripRequest().getId(),
                invitation.getDriverId(),
                invitation.getTripRequest().getPassengerId()
        );
    }

    @Transactional
    public TripRequestResponse acceptInvitation(String invitationId) {
        UserResponse user = identityServiceClient.getUserInfo().getResult();
        TripRequestInvitation acceptedInvitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND));

        TripRequest tripRequest = acceptedInvitation.getTripRequest();

        if (!tripRequest.getPassengerId().equals(user.getId())) {
            throw new AppException(ErrorCode.NOT_YOUR_REQUEST);
        }

        if (tripRequest.getStatus() != TripRequestStatus.OPEN) {
            throw new AppException(ErrorCode.REQUEST_NOT_OPEN);
        }
        
        if (acceptedInvitation.getStatus() != InvitationStatus.PENDING) {
            throw new AppException(ErrorCode.TRIP_REQUEST_INVITATION_NOT_FOUND); // Using existing error code or INVITATION_ALREADY_PROCESSED if exists
        }

        // 1. Khóa Optimistic & Chốt Yêu cầu
        tripRequest.setStatus(TripRequestStatus.ACCEPTED);
        tripRequest = tripRequestRepository.save(tripRequest);

        // 2. Chốt Lời mời được chọn
        acceptedInvitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(acceptedInvitation);

        // 3. Đá các Lời mời khác
        List<TripRequestInvitation> otherInvitations = tripRequest.getInvitations().stream()
                .filter(inv -> !inv.getId().equals(acceptedInvitation.getId()) && inv.getStatus() == InvitationStatus.PENDING)
                .toList();
        otherInvitations.forEach(inv -> {
            inv.setStatus(InvitationStatus.REJECTED);
            marketplaceEventProducer.publishInvitationRejectedEvent(
                    inv.getId(),
                    tripRequest.getId(),
                    inv.getDriverId(),
                    user.getId()
            );
        });
        invitationRepository.saveAll(otherInvitations);

        // 4. Bắn Kafka Event sang booking-service và notification-service
        marketplaceEventProducer.publishInvitationAcceptedEvent(
                tripRequest.getId(),
                acceptedInvitation.getDriverId(),
                user.getId(),
                acceptedInvitation.getId()
        );
        log.info("TripRequest {} accepted invitation {} from driver {}", tripRequest.getId(), acceptedInvitation.getId(), acceptedInvitation.getDriverId());

        return mapToTripRequestResponse(tripRequest, user);
    }

    // ----- DRIVER APIs -----

    public Page<TripRequestResponse> getOpenRequestsInMarketplace(
            String startProvinceId, String endProvinceId, 
            String startWardId, String endWardId, 
            java.time.LocalDateTime fromTime, java.time.LocalDateTime toTime, 
            Integer minSeat, Pageable pageable) {
            
        return tripRequestRepository.getMarketplaceRequests(
                        startProvinceId, endProvinceId, startWardId, endWardId, fromTime, toTime, minSeat, TripRequestStatus.OPEN, pageable)
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

        com.rideup.trip_service.entity.Trip trip = tripRepository.findById(request.getTripId())
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
        
        marketplaceEventProducer.publishTripRequestInvitedEvent(
                invitation.getId(),
                tripRequest.getId(),
                driver.getId(),
                tripRequest.getPassengerId(),
                trip.getId()
        );
        
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
