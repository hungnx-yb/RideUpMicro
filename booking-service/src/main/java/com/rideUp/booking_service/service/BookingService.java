package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.request.*;
import com.rideUp.booking_service.dto.event.BookingCancelledEvent;
import com.rideUp.booking_service.dto.event.BookingConfirmedEvent;
import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
import com.rideUp.booking_service.dto.response.BookingResponse;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.response.UserResponse;
import com.rideUp.booking_service.entity.Booking;
import com.rideUp.booking_service.enums.BookingStatus;
import com.rideUp.booking_service.enums.PaymentMethod;
import com.rideUp.booking_service.enums.PaymentStatus;
import com.rideUp.booking_service.exception.AppException;
import com.rideUp.booking_service.exception.ErrorCode;
import com.rideUp.booking_service.feignClient.IdentityServiceClient;
import com.rideUp.booking_service.feignClient.TripServiceClient;
import com.rideUp.booking_service.kafka.producer.BookingServicePublisher;
import com.rideUp.booking_service.repository.BookingRepository;
import com.rideUp.booking_service.utils.SecurityUtils;
import feign.FeignException;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingService {

    static DateTimeFormatter CODE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    BookingRepository bookingRepository;
    TripServiceClient tripServiceClient;
    BookingServicePublisher bookingServicePublisher;
    ModelMapper modelMapper;
    IdentityServiceClient identityServiceClient;

    @NonFinal
    @Value("${expiryTime:3600}")
    long expirySeconds;

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request) {
        BigDecimal tripPricePerSeat = reserveTripSeats(request.getTripId(), request.getSeatCount());
        LocalDateTime now = LocalDateTime.now();
        String correlationId = UUID.randomUUID().toString();
        Booking booking = modelMapper.map(request, Booking.class);
        booking.setBookingCode(generateBookingCode());
        booking.setStatus(request.getPaymentMethod() == PaymentMethod.CASH ? BookingStatus.WAITING_DRIVER_APPROVAL : BookingStatus.PENDING_PAYMENT);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        booking.setTotalAmount(tripPricePerSeat.multiply(BigDecimal.valueOf(request.getSeatCount())));
        booking.setReservedAt(now);
        booking.setCustomerId(SecurityUtils.getCurrentUserId());
        booking.setExpiresAt(now.plusSeconds(expirySeconds)); // Áp dụng cho cả Cash và Stripe
        Booking saved = bookingRepository.save(booking);
        publishPaymentRequested(saved, request.getPaymentMethod(), now, correlationId);

        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            com.rideUp.booking_service.dto.event.BookingWaitingApprovalEvent waitEvent = com.rideUp.booking_service.dto.event.BookingWaitingApprovalEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .correlationId(correlationId)
                    .bookingId(saved.getId())
                    .customerId(saved.getCustomerId())
                    .tripId(saved.getTripId())
                    .seatCount(saved.getSeatCount())
                    .paymentMethod(String.valueOf(request.getPaymentMethod()))
                    .totalAmount(saved.getTotalAmount())
                    .createdAt(now)
                    .build();
            bookingServicePublisher.publishBookingWaitingApproval(waitEvent);
        }
        return modelMapper.map(saved, BookingResponse.class);
    }

    @Transactional
    public BookingResponse handlePaymentCompleted(PaymentCompletedRequest request) {
        log.info("Handling payment completed for bookingId={}, paymentId={}, correlationId={}",
            request.getBookingId(), request.getPaymentId(), request.getCorrelationId());

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            booking.setPaymentId(request.getPaymentId());
            booking.setPaymentStatus(PaymentStatus.PAID);
            Booking saved = bookingRepository.save(booking);
            return modelMapper.map(saved, BookingResponse.class);
        }

        return modelMapper.map(booking, BookingResponse.class);
    }

    @Transactional
    public void markBookingWaitingApproval(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking != null && booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.WAITING_DRIVER_APPROVAL);
            bookingRepository.save(booking);

            com.rideUp.booking_service.dto.event.BookingWaitingApprovalEvent waitEvent = com.rideUp.booking_service.dto.event.BookingWaitingApprovalEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .correlationId(UUID.randomUUID().toString())
                    .bookingId(booking.getId())
                    .customerId(booking.getCustomerId())
                    .tripId(booking.getTripId())
                    .seatCount(booking.getSeatCount())
                    .paymentMethod(PaymentMethod.STRIPE.name())
                    .totalAmount(booking.getTotalAmount())
                    .createdAt(LocalDateTime.now())
                    .build();
            bookingServicePublisher.publishBookingWaitingApproval(waitEvent);
        }
    }

    @Transactional
    public BookingResponse handlePaymentFailed(PaymentFailedRequest request) {
        log.info("Handling payment failed for bookingId={}, paymentId={}, correlationId={}",
            request.getBookingId(), request.getPaymentId(), request.getCorrelationId());

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.COMPLETED) {
            return modelMapper.map(booking, BookingResponse.class);
        }

        booking.setStatus(BookingStatus.CANCELLED_PAYMENT_FAILED);
        booking.setPaymentId(request.getPaymentId());
        booking.setPaymentStatus(PaymentStatus.FAILED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(
                request.getReason() == null || request.getReason().isBlank()
                        ? "Payment failed"
                        : request.getReason()
        );
        booking.setExpiresAt(null);

        Booking saved = bookingRepository.save(booking);
        publishBookingCancelled(saved, request.getCorrelationId(), saved.getCancelReason());
        return modelMapper.map(saved, BookingResponse.class);
    }

    @Transactional
    public BookingResponse approveBooking(String bookingId) {
        // Kiểm tra nợ của tài xế
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
            log.warn("Failed to check wallet debt during approveBooking: {}", e.getMessage());
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() != BookingStatus.WAITING_DRIVER_APPROVAL) {
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND); 
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setExpiresAt(null);
        Booking saved = bookingRepository.save(booking);

        String correlationId = UUID.randomUUID().toString();
        publishBookingConfirmed(saved, correlationId);

        com.rideUp.booking_service.dto.event.BookingApprovedEvent event = com.rideUp.booking_service.dto.event.BookingApprovedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(saved.getId())
                .build();
        bookingServicePublisher.publishBookingApproved(event);

        return modelMapper.map(saved, BookingResponse.class);
    }

    @Transactional
    public BookingResponse rejectBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() != BookingStatus.WAITING_DRIVER_APPROVAL) {
            throw new AppException(ErrorCode.BOOKING_NOT_FOUND); 
        }

        booking.setStatus(BookingStatus.REJECTED_BY_DRIVER);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason("Driver rejected");
        booking.setExpiresAt(null);
        Booking saved = bookingRepository.save(booking);

        String correlationId = UUID.randomUUID().toString();
        publishBookingCancelled(saved, correlationId, saved.getCancelReason());

        com.rideUp.booking_service.dto.event.BookingRejectedEvent event = com.rideUp.booking_service.dto.event.BookingRejectedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(saved.getId())
                .build();
        bookingServicePublisher.publishBookingRejected(event);

        return modelMapper.map(saved, BookingResponse.class);
    }



    public BookingResponse getBookingDetail(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        
        BookingResponse response = modelMapper.map(booking, BookingResponse.class);
        
        if (booking.getCustomerId() != null && !booking.getCustomerId().isBlank()) {
            try {
                var userResponseList = identityServiceClient.getUsersInfoByIds(List.of(booking.getCustomerId())).getResult();
                if (userResponseList != null && !userResponseList.isEmpty()) {
                    var user = userResponseList.get(0);
                    response.setUserName(user.getFullName());
                    response.setUserAvatar(user.getAvatarUrl());
                }
            } catch (Exception e) {
                log.warn("Failed to fetch user info for booking detail: {}", e.getMessage());
            }
        }
        
        return response;
    }

    public List<BookingResponse> getMyBookings() {
        String customerId =SecurityUtils.getCurrentUserId();
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(booking -> modelMapper.map(booking, BookingResponse.class))
                .toList();
    }

    public List<BookingResponse> getBookingsByTripId(String tripId) {
        if (tripId == null || tripId.isBlank()) {
            return List.of();
        }

        List<Booking> bookingList = bookingRepository.findByTripIdOrderByCreatedAtDesc(tripId);
        if (bookingList.isEmpty()) {
            return List.of();
        }

        List<String> userIds = bookingList.stream()
                .map(Booking::getCustomerId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();


        List<UserResponse> response = identityServiceClient.getUsersInfoByIds(userIds).getResult();
        Map<String, UserResponse> userMap = response.stream()
                .filter(user -> user.getId() != null)
                .collect(Collectors.toMap(UserResponse::getId, user -> user, (a, b) -> a));

        return bookingList.stream()
                .map(booking -> {
                    BookingResponse responseItem = modelMapper.map(booking, BookingResponse.class);
                    UserResponse user = userMap.get(booking.getCustomerId());
                    if (user != null) {
                        responseItem.setUserName(user.getFullName());
                        responseItem.setUserAvatar(user.getAvatarUrl());
                    }
                    return responseItem;
                })
                .toList();
    }

    @Transactional
    public BookingResponse cancelBooking(String bookingId, CancelBookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        ensureCancelableStatus(booking);

        booking.setStatus(BookingStatus.CANCELLED_USER);
        if (booking.getPaymentStatus() != PaymentStatus.PAID) {
            booking.setPaymentStatus(PaymentStatus.FAILED);
        }
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(request == null ? null : request.getReason());
        booking.setStatus(BookingStatus.CANCELLED_USER);
        Booking saved = bookingRepository.save(booking);
        String correlationId = UUID.randomUUID().toString();
        String cancelReason = saved.getCancelReason() == null || saved.getCancelReason().isBlank()
                ? "Cancelled by user"
                : saved.getCancelReason();
        publishBookingCancelled(saved, correlationId, cancelReason);

        if (saved.getPaymentStatus() == PaymentStatus.PAID) {
            publishBookingCancellRequested(saved, correlationId, cancelReason);
        }
        return modelMapper.map(saved, BookingResponse.class);
    }

    @Transactional
    public BookingResponse completeBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new AppException(ErrorCode.BOOKING_ALREADY_CANCELLED);
        }

        booking.setStatus(BookingStatus.COMPLETED);
        Booking saved = bookingRepository.save(booking);

        String correlationId = UUID.randomUUID().toString();
        
        String driverId = null;
        try {
            var tripResponse = tripServiceClient.getTripById(saved.getTripId());
            if (tripResponse != null && tripResponse.getResult() != null) {
                driverId = tripResponse.getResult().getDriverId();
            }
        } catch (Exception ex) {
            log.warn("Failed to get driverId for trip: {}", saved.getTripId());
        }
        
        com.rideUp.booking_service.dto.event.BookingCompletedEvent event = com.rideUp.booking_service.dto.event.BookingCompletedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(saved.getId())
                .customerId(saved.getCustomerId())
                .driverId(driverId)
                .tripId(saved.getTripId())
                .totalAmount(saved.getTotalAmount())
                .completedAt(LocalDateTime.now())
                .build();
                
        bookingServicePublisher.publishBookingCompleted(event);

        return modelMapper.map(saved, BookingResponse.class);
    }

    @Transactional
    public int expirePendingBookings() {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> pendingExpiredBookings = bookingRepository
            .findByStatusInAndExpiresAtBefore(List.of(BookingStatus.PENDING_PAYMENT, BookingStatus.WAITING_DRIVER_APPROVAL), now);

        if (pendingExpiredBookings.isEmpty()) {
            return 0;
        }
        int expiredCount = 0;
        for (Booking booking : pendingExpiredBookings) {
            try {
                booking.setPaymentStatus(PaymentStatus.FAILED);
                booking.setCancelledAt(now);
                booking.setCancelReason(booking.getStatus() == BookingStatus.PENDING_PAYMENT ? "Payment timeout" : "Driver approval timeout");
                booking.setStatus(BookingStatus.EXPIRED);
                booking.setExpiresAt(null);
                
                publishBookingCancelled(booking, UUID.randomUUID().toString(), booking.getCancelReason());
                
                // Bắn event rejected nếu là đơn chờ duyệt timeout để hoàn tiền hold
                if (booking.getStatus() == BookingStatus.WAITING_DRIVER_APPROVAL) {
                    com.rideUp.booking_service.dto.event.BookingRejectedEvent event = com.rideUp.booking_service.dto.event.BookingRejectedEvent.builder()
                            .eventId(UUID.randomUUID().toString())
                            .correlationId(UUID.randomUUID().toString())
                            .bookingId(booking.getId())
                            .build();
                    bookingServicePublisher.publishBookingRejected(event);
                }
                
                expiredCount++;
            } catch (Exception ex) {
                log.warn("Failed to auto-expire booking {}: {}", booking.getId(), ex.getMessage());
            }
        }
        bookingRepository.saveAll(pendingExpiredBookings);
        return expiredCount;
    }
    private BigDecimal reserveTripSeats(String tripId, Integer seatCount) {
        try {
            ApiResponse<SeatResponse> response = tripServiceClient.reserveSeats(
                    SeatReserveRequest.builder()
                            .tripId(tripId)
                            .seatCount(seatCount)
                            .build()
            );
            if (response == null || response.getResult() == null) {
                throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
            }

            BigDecimal priceVnd = response.getResult().getPriceVnd();
            if (priceVnd == null || priceVnd.compareTo(BigDecimal.ZERO) <= 0) {
                throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
            }

            return priceVnd;
        } catch (FeignException ex) {
            throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
        }
    }

    private void ensureCancelableStatus(Booking booking) {
        if (booking.getStatus() == BookingStatus.CANCELLED_USER
                || booking.getStatus() == BookingStatus.CANCELLED_PAYMENT_FAILED) {
            throw new AppException(ErrorCode.BOOKING_ALREADY_CANCELLED);
        }
        if (booking.getStatus() == BookingStatus.EXPIRED) {
            throw new AppException(ErrorCode.BOOKING_EXPIRED);
        }
        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new AppException(ErrorCode.BOOKING_ALREADY_CONFIRMED);
        }
    }



    private String generateBookingCode() {
        String code = "BK" + LocalDateTime.now().format(CODE_TIME_FORMATTER)
                + ThreadLocalRandom.current().nextInt(1000, 10000);

        if (bookingRepository.findByBookingCode(code).isPresent()) {
            return generateBookingCode();
        }
        return code;
    }


    private void publishPaymentRequested(Booking booking, PaymentMethod paymentMethod, LocalDateTime now, String correlationId) {
        PaymentRequestedEvent event = PaymentRequestedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(booking.getId())
                .customerId(booking.getCustomerId())
                .tripId(booking.getTripId())
                .seatCount(booking.getSeatCount())
                .amount(booking.getTotalAmount())
                .paymentMethod(paymentMethod.name())
                .createdAt(now)
                .build();

        log.info("Publishing payment request for bookingId={}, correlationId={}", booking.getId(), correlationId);
        bookingServicePublisher.publishPaymentRequested(event);
    }

    private void publishBookingConfirmed(Booking booking, String correlationId) {
        BookingConfirmedEvent event = BookingConfirmedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(booking.getId())
                .tripId(booking.getTripId())
                .seatCount(booking.getSeatCount())
                .createdAt(LocalDateTime.now())
                .build();
        bookingServicePublisher.publishBookingConfirmed(event);
    }

    private void publishBookingCancelled(Booking booking, String correlationId, String reason) {
        BookingCancelledEvent event = BookingCancelledEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(booking.getId())
                .tripId(booking.getTripId())
                .seatCount(booking.getSeatCount())
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build();
        bookingServicePublisher.publishBookingCancelled(event);
    }

    private void publishBookingCancellRequested(Booking booking, String correlationId, String  reason) {
        BookingCancelledEvent event = BookingCancelledEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(booking.getId())
                .tripId(booking.getTripId())
                .seatCount(booking.getSeatCount())
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build();
        bookingServicePublisher.publishBookingCancellRequest(event);
    }


}
