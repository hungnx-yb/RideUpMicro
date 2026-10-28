package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.request.*;
import com.rideUp.booking_service.dto.event.BookingCancelledEvent;
import com.rideUp.booking_service.dto.event.BookingConfirmedEvent;
import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
import com.rideUp.booking_service.dto.response.BookingResponse;
import com.rideUp.booking_service.dto.response.TripResponse;
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

    public void checkDuplicateBooking(String tripId) {
        String currentCustomerId = SecurityUtils.getCurrentUserId();
        List<BookingStatus> activeStatuses = List.of(
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.WAITING_DRIVER_APPROVAL,
                BookingStatus.CONFIRMED
        );
        boolean alreadyBooked = bookingRepository.existsByCustomerIdAndTripIdAndStatusIn(
                currentCustomerId, tripId, activeStatuses);
        if (alreadyBooked) {
            throw new AppException(ErrorCode.DUPLICATE_BOOKING);
        }
    }

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request) {
        // Chặn đặt trùng: kiểm tra khách đã có vé đang hoạt động cho chuyến này chưa
        checkDuplicateBooking(request.getTripId());

        TripResponse trip = validateAndGetTrip(request.getTripId(), request.getSeatCount());
        BigDecimal tripPricePerSeat = trip.getPriceVnd();
        LocalDateTime now = LocalDateTime.now();
        String correlationId = UUID.randomUUID().toString();
        Booking booking = modelMapper.map(request, Booking.class);
        booking.setBookingCode(generateBookingCode());

        boolean isStripePrePaid = request.getPaymentMethod() == PaymentMethod.STRIPE
                && request.getPaymentIntentId() != null
                && !request.getPaymentIntentId().isBlank();

        booking.setStatus(
                (request.getPaymentMethod() == PaymentMethod.CASH || isStripePrePaid)
                        ? BookingStatus.WAITING_DRIVER_APPROVAL
                        : BookingStatus.PENDING_PAYMENT
        );
        booking.setPaymentStatus(PaymentStatus.PENDING);
        if (isStripePrePaid) {
            booking.setPaymentId(request.getPaymentIntentId());
        }
        booking.setTotalAmount(tripPricePerSeat.multiply(BigDecimal.valueOf(request.getSeatCount())));
        booking.setReservedAt(now);
        booking.setCustomerId(SecurityUtils.getCurrentUserId());

        // Đặt TTL (thời gian hết hạn):
        // - WAITING_DRIVER_APPROVAL: Hết hạn trước khi chuyến khởi hành 1 tiếng
        // - PENDING_PAYMENT: Hết hạn sau thời gian timeout thanh toán (hoặc trước khởi hành 1 tiếng nếu cận giờ)
        if (booking.getStatus() == BookingStatus.WAITING_DRIVER_APPROVAL) {
            booking.setExpiresAt(trip.getDepartureTime() != null
                    ? trip.getDepartureTime().minusHours(1)
                    : now.plusSeconds(expirySeconds));
        } else {
            LocalDateTime paymentDeadline = now.plusSeconds(expirySeconds);
            if (trip.getDepartureTime() != null && trip.getDepartureTime().minusHours(1).isBefore(paymentDeadline)) {
                booking.setExpiresAt(trip.getDepartureTime().minusHours(1));
            } else {
                booking.setExpiresAt(paymentDeadline);
            }
        }
        Booking saved = bookingRepository.save(booking);
        publishPaymentRequested(saved, request.getPaymentMethod(), now, correlationId, request.getPaymentIntentId());

        if (request.getPaymentMethod() == PaymentMethod.CASH || isStripePrePaid) {
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
    public BookingResponse createBookingFromInvitation(AcceptInvitationRequest request) {
        String currentUserId = SecurityUtils.getCurrentUserId();

        com.rideUp.booking_service.dto.response.ProcessMarketplaceBookingResponse processResp;
        try {
            var apiResponse = tripServiceClient.validateAndReserve(request.getInvitationId(), currentUserId);
            if (apiResponse == null || apiResponse.getResult() == null) {
                throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
            }
            processResp = apiResponse.getResult();
        } catch (feign.FeignException e) {
            log.error("Failed to process invitation in trip-service: {}", e.getMessage());
            throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
        }
        String correlationId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        Booking booking = new Booking();
        booking.setBookingCode(generateBookingCode());
        booking.setTripId(processResp.getTripId());
        booking.setCustomerId(currentUserId);
        booking.setSeatCount(processResp.getSeatCount());
        booking.setTotalAmount(processResp.getPriceVnd().multiply(BigDecimal.valueOf(processResp.getSeatCount())));
        booking.setPaymentStatus(PaymentStatus.PENDING);
        booking.setReservedAt(now);
        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setExpiresAt(null);
        } else {
            booking.setStatus(BookingStatus.PENDING_PAYMENT);
            booking.setExpiresAt(now.plusSeconds(expirySeconds));
        }

        Booking saved = bookingRepository.save(booking);
        publishPaymentRequested(saved, request.getPaymentMethod(), now, correlationId);
        if (request.getPaymentMethod() == PaymentMethod.CASH) {
                publishBookingConfirmed(saved, correlationId); 
        }

        bookingServicePublisher.publishMarketplaceBookingCreated(
            com.rideUp.booking_service.dto.event.MarketplaceBookingCreatedEvent.builder()
                .bookingId(saved.getId())
                .invitationId(request.getInvitationId())
                .customerId(saved.getCustomerId())
                .build()
        );

        return modelMapper.map(saved, BookingResponse.class);
    }

    @Transactional
    public BookingResponse handlePaymentCompleted(PaymentCompletedRequest request) {
        log.info("Handling payment completed for bookingId={}, paymentId={}, correlationId={}",
            request.getBookingId(), request.getPaymentId(), request.getCorrelationId());

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.COMPLETED) {
            booking.setPaymentId(request.getPaymentId());
            booking.setPaymentStatus(PaymentStatus.PAID);
            Booking saved = bookingRepository.save(booking);
            return toBookingResponse(saved);
        }

        return toBookingResponse(booking);
    }

    @Transactional
    public void markBookingWaitingApproval(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking != null && booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            booking.setStatus(BookingStatus.WAITING_DRIVER_APPROVAL);
            try {
                var tripResponse = tripServiceClient.getTripById(booking.getTripId());
                if (tripResponse != null && tripResponse.getResult() != null && tripResponse.getResult().getDepartureTime() != null) {
                    booking.setExpiresAt(tripResponse.getResult().getDepartureTime().minusHours(1));
                }
            } catch (Exception e) {
                log.warn("Failed to fetch trip departureTime in markBookingWaitingApproval: {}", e.getMessage());
            }
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

        BookingStatus oldStatus = booking.getStatus();
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
        if (oldStatus == BookingStatus.CONFIRMED) {
            publishBookingCancelled(saved, request.getCorrelationId(), saved.getCancelReason());
        }
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

        // Chặn duyệt nếu yêu cầu đã hết hạn
        if (booking.getExpiresAt() != null && LocalDateTime.now().isAfter(booking.getExpiresAt())) {
            throw new AppException(ErrorCode.BOOKING_EXPIRED);
        }

        // Kiểm tra trạng thái chuyến đi: không thể duyệt khi xe đã khởi hành hoặc đã huỷ/hoàn thành hoặc vào khung 1 tiếng trước giờ chạy
        try {
            var tripResponse = tripServiceClient.getTripById(booking.getTripId());
            if (tripResponse != null && tripResponse.getResult() != null) {
                var trip = tripResponse.getResult();
                var tripStatus = trip.getStatus();
                if (tripStatus != null && !"OPEN".equalsIgnoreCase(tripStatus) && !"FULL".equalsIgnoreCase(tripStatus)) {
                    throw new AppException(ErrorCode.TRIP_ALREADY_STARTED);
                }
                if (trip.getDepartureTime() != null && LocalDateTime.now().isAfter(trip.getDepartureTime().minusHours(1))) {
                    throw new AppException(ErrorCode.BOOKING_EXPIRED);
                }
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to check trip status during approveBooking: {}", e.getMessage());
        }

        // Chính thức trừ ghế tại đây khi tài xế duyệt đơn
        reserveTripSeats(booking.getTripId(), booking.getSeatCount());

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setExpiresAt(null);
        Booking saved = bookingRepository.save(booking);

        String correlationId = UUID.randomUUID().toString();
        publishBookingConfirmed(saved, correlationId);

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
        // Không publishBookingCancelled vì đơn này chưa từng được duyệt (chưa từng trừ ghế)

        com.rideUp.booking_service.dto.event.BookingRejectedEvent event = com.rideUp.booking_service.dto.event.BookingRejectedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(saved.getId())
                .build();
        bookingServicePublisher.publishBookingRejected(event);

        return modelMapper.map(saved, BookingResponse.class);
    }



    public PaymentMethod resolvePaymentMethod(Booking booking) {
        if (booking.getPaymentId() != null && (booking.getPaymentId().startsWith("pi_") || booking.getPaymentId().startsWith("pm_"))) {
            return PaymentMethod.STRIPE;
        }
        return PaymentMethod.CASH;
    }

    public BookingResponse toBookingResponse(Booking booking) {
        BookingResponse response = modelMapper.map(booking, BookingResponse.class);
        response.setPaymentMethod(resolvePaymentMethod(booking));
        return response;
    }

    public BookingResponse getBookingDetail(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        
        BookingResponse response = toBookingResponse(booking);
        
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
        String customerId = SecurityUtils.getCurrentUserId();
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(this::toBookingResponse)
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
                    BookingResponse responseItem = toBookingResponse(booking);
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

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(BookingStatus.CANCELLED_USER);
        if (booking.getPaymentStatus() != PaymentStatus.PAID) {
            booking.setPaymentStatus(PaymentStatus.FAILED);
        }
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(request == null ? null : request.getReason());
        Booking saved = bookingRepository.save(booking);
        String correlationId = UUID.randomUUID().toString();
        String cancelReason = saved.getCancelReason() == null || saved.getCancelReason().isBlank()
                ? "Cancelled by user"
                : saved.getCancelReason();

        // Chỉ release ghế trên trip-service nếu đơn đã từng được duyệt (CONFIRMED)
        if (oldStatus == BookingStatus.CONFIRMED) {
            publishBookingCancelled(saved, correlationId, cancelReason);
        }

        // Luôn gửi yêu cầu hoàn tiền / huỷ giữ cọc qua payment-service
        publishBookingCancellRequested(saved, correlationId, cancelReason);
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
        if (resolvePaymentMethod(booking) == PaymentMethod.CASH) {
            booking.setPaymentStatus(PaymentStatus.PAID);
        }
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

        return toBookingResponse(saved);
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
                BookingStatus oldStatus = booking.getStatus();
                booking.setPaymentStatus(PaymentStatus.FAILED);
                booking.setCancelledAt(now);
                booking.setCancelReason(oldStatus == BookingStatus.PENDING_PAYMENT 
                        ? "Payment timeout" 
                        : "Tự động hủy: Đã tới giới hạn 1 tiếng trước khi chuyến khởi hành mà tài xế chưa duyệt");
                booking.setStatus(BookingStatus.EXPIRED);
                booking.setExpiresAt(null);
                
                // Đơn hết hạn chưa từng được duyệt nên không trừ ghế -> Không cần release ghế

                // Bắn event rejected nếu là đơn chờ duyệt timeout để hoàn tiền hold
                if (oldStatus == BookingStatus.WAITING_DRIVER_APPROVAL) {
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

    private TripResponse validateAndGetTrip(String tripId, Integer seatCount) {
        try {
            ApiResponse<TripResponse> response = tripServiceClient.getTripById(tripId);
            if (response == null || response.getResult() == null) {
                throw new AppException(ErrorCode.TRIP_NOT_FOUND);
            }
            TripResponse trip = response.getResult();
            if (trip.getStatus() != null && !"OPEN".equalsIgnoreCase(trip.getStatus())) {
                throw new AppException(ErrorCode.SEAT_NOT_AVAILABLE);
            }
            if (trip.getSeatAvailable() == null || trip.getSeatAvailable() < seatCount) {
                throw new AppException(ErrorCode.SEAT_NOT_AVAILABLE);
            }
            BigDecimal priceVnd = trip.getPriceVnd();
            if (priceVnd == null || priceVnd.compareTo(BigDecimal.ZERO) <= 0) {
                throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
            }
            if (trip.getDepartureTime() != null && trip.getDepartureTime().minusHours(1).isBefore(LocalDateTime.now())) {
                throw new AppException(ErrorCode.TRIP_DEPARTURE_TOO_SOON);
            }
            return trip;
        } catch (FeignException ex) {
            if (ex.status() == 404) {
                throw new AppException(ErrorCode.TRIP_NOT_FOUND);
            }
            throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
        }
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
            if (ex.status() == 400) {
                throw new AppException(ErrorCode.SEAT_NOT_AVAILABLE);
            }
            throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
        }
    }

    @Transactional
    public void handleTripCancelled(String tripId, String cancelReason) {
        log.info("Handling trip cancelled event for tripId={}, reason={}", tripId, cancelReason);
        List<BookingStatus> activeStatuses = List.of(
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.WAITING_DRIVER_APPROVAL,
                BookingStatus.CONFIRMED
        );

        List<Booking> bookingsToCancel = bookingRepository.findByTripIdAndStatusIn(tripId, activeStatuses);
        if (bookingsToCancel.isEmpty()) {
            log.info("No active bookings found to cancel for tripId={}", tripId);
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        String reason = cancelReason != null && !cancelReason.isBlank() ? cancelReason : "Tài xế huỷ chuyến";

        for (Booking booking : bookingsToCancel) {
            String correlationId = UUID.randomUUID().toString();
            PaymentStatus oldPaymentStatus = booking.getPaymentStatus();
            BookingStatus oldStatus = booking.getStatus();

            booking.setStatus(BookingStatus.CANCELLED_DRIVER);
            booking.setCancelledAt(now);
            booking.setCancelReason(reason);
            booking.setExpiresAt(null);

            // Xử lý hoàn tiền / giải phóng cọc tự động qua payment-service
            publishBookingCancellRequested(booking, correlationId, reason);
            com.rideUp.booking_service.dto.event.BookingRejectedEvent rejectedEvent = com.rideUp.booking_service.dto.event.BookingRejectedEvent.builder()
                    .eventId(UUID.randomUUID().toString())
                    .correlationId(correlationId)
                    .bookingId(booking.getId())
                    .build();
            bookingServicePublisher.publishBookingRejected(rejectedEvent);

            // Bắn event báo huỷ vé để notification-service gửi thông báo push/SMS đến khách hàng
            publishBookingCancelled(booking, correlationId, reason);
        }

        bookingRepository.saveAll(bookingsToCancel);
        log.info("Successfully cancelled {} bookings and triggered refunds for tripId={}", bookingsToCancel.size(), tripId);
    }

    @Transactional
    public void handleTripCompleted(String tripId) {
        log.info("Handling trip completed event for tripId={}", tripId);
        List<Booking> bookings = bookingRepository.findByTripIdOrderByCreatedAtDesc(tripId);
        if (bookings.isEmpty()) {
            log.info("No bookings found for completed tripId={}", tripId);
            return;
        }

        for (Booking booking : bookings) {
            if (booking.getStatus() == BookingStatus.CONFIRMED) {
                try {
                    completeBooking(booking.getId());
                    log.info("Auto-completed bookingId={} for tripId={}", booking.getId(), tripId);
                } catch (Exception ex) {
                    log.error("Failed to auto-complete bookingId={} for tripId={}: {}", booking.getId(), tripId, ex.getMessage());
                }
            } else if (booking.getStatus() == BookingStatus.WAITING_DRIVER_APPROVAL || booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                try {
                    BookingStatus oldStatus = booking.getStatus();
                    booking.setStatus(BookingStatus.EXPIRED);
                    booking.setCancelledAt(LocalDateTime.now());
                    booking.setCancelReason("Chuyến đi đã hoàn thành");
                    booking.setExpiresAt(null);
                    bookingRepository.save(booking);

                    if (oldStatus == BookingStatus.WAITING_DRIVER_APPROVAL) {
                        com.rideUp.booking_service.dto.event.BookingRejectedEvent rejectedEvent = com.rideUp.booking_service.dto.event.BookingRejectedEvent.builder()
                                .eventId(UUID.randomUUID().toString())
                                .correlationId(UUID.randomUUID().toString())
                                .bookingId(booking.getId())
                                .build();
                        bookingServicePublisher.publishBookingRejected(rejectedEvent);
                    }
                } catch (Exception ex) {
                    log.error("Failed to expire pending bookingId={} on trip completion: {}", booking.getId(), ex.getMessage());
                }
            }
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
        publishPaymentRequested(booking, paymentMethod, now, correlationId, null);
    }

    private void publishPaymentRequested(Booking booking, PaymentMethod paymentMethod, LocalDateTime now, String correlationId, String transactionId) {
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
                .transactionId(transactionId)
                .build();

        log.info("Publishing payment request for bookingId={}, correlationId={}, transactionId={}", booking.getId(), correlationId, transactionId);
        bookingServicePublisher.publishPaymentRequested(event);
    }

    private void publishBookingConfirmed(Booking booking, String correlationId) {
        BookingConfirmedEvent event = BookingConfirmedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(booking.getId())
                .customerId(booking.getCustomerId())
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
