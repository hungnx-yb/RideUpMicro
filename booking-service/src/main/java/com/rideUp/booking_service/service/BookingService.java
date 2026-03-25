package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.request.CancelBookingRequest;
import com.rideUp.booking_service.dto.request.CreateBookingRequest;
import com.rideUp.booking_service.dto.request.PaymentCompletedRequest;
import com.rideUp.booking_service.dto.request.PaymentFailedRequest;
import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
import com.rideUp.booking_service.dto.response.BookingResponse;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.request.TripSeatReleaseRequest;
import com.rideUp.booking_service.dto.request.TripSeatReserveRequest;
import com.rideUp.booking_service.dto.request.TripSeatUpdateResponse;
import com.rideUp.booking_service.entity.Booking;
import com.rideUp.booking_service.enums.BookingStatus;
import com.rideUp.booking_service.enums.PaymentMethod;
import com.rideUp.booking_service.exception.AppException;
import com.rideUp.booking_service.exception.ErrorCode;
import com.rideUp.booking_service.feignClient.TripServiceClient;
import com.rideUp.booking_service.kafka.producer.BookingEventPublisher;
import com.rideUp.booking_service.repository.BookingRepository;
import feign.FeignException;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingService {

    static final DateTimeFormatter CODE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    final BookingRepository bookingRepository;
    final TripServiceClient tripServiceClient;
    final BookingEventPublisher bookingEventPublisher;

    @Value("${expiryTime:3600}")
    long expirySeconds;

    @Value("${booking.payment.default-price-per-seat:10000}")
    BigDecimal defaultPricePerSeat;

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request) {
        reserveTripSeats(request.getTripId(), request.getSeatCount());

        LocalDateTime now = LocalDateTime.now();

        Booking booking = Booking.builder()
                .bookingCode(generateBookingCode())
                .customerId(resolveCurrentUserId())
                .tripId(request.getTripId())
                .status(BookingStatus.PENDING)
                .seatCount(request.getSeatCount())
            .pricePerSeat(defaultPricePerSeat)
            .totalAmount(defaultPricePerSeat.multiply(BigDecimal.valueOf(request.getSeatCount())))
                .pickupLat(request.getPickupLat())
                .pickupLng(request.getPickupLng())
                .pickupAddressText(request.getPickupAddressText())
                .dropoffLat(request.getDropoffLat())
                .dropoffLng(request.getDropoffLng())
                .dropoffAddressText(request.getDropoffAddressText())
                .note(request.getNote())
                .reservedAt(now)
                .expiresAt(request.getPaymentMethod() == PaymentMethod.VNPAY ? now.plusSeconds(expirySeconds) : null)
                .build();

        Booking saved = bookingRepository.save(booking);
        publishPaymentRequested(saved, request.getPaymentMethod(), now);
        return toResponse(saved);
    }

    @Transactional
    public BookingResponse handlePaymentCompleted(PaymentCompletedRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return toResponse(booking);
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new AppException(ErrorCode.BOOKING_NOT_PENDING);
        }

        booking.setPaymentId(request.getPaymentId());
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setExpiresAt(null);
        booking.setCancelReason(null);
        booking.setCancelledAt(null);

        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse handlePaymentFailed(PaymentFailedRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
            return toResponse(booking);
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new AppException(ErrorCode.BOOKING_NOT_PENDING);
        }

        releaseTripSeats(booking.getTripId(), booking.getSeatCount());
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setPaymentId(request.getPaymentId());
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(
                request.getReason() == null || request.getReason().isBlank()
                        ? "Payment failed"
                        : request.getReason()
        );

        return toResponse(bookingRepository.save(booking));
    }

    public BookingResponse getBookingDetail(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        return toResponse(booking);
    }

    public List<BookingResponse> getMyBookings() {
        String customerId = resolveCurrentUserId();
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BookingResponse cancelBooking(String bookingId, CancelBookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        ensurePendingStatus(booking);
        releaseTripSeats(booking.getTripId(), booking.getSeatCount());

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(request == null ? null : request.getReason());

        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public int expirePendingBookings() {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> pendingExpiredBookings = bookingRepository
                .findByStatusAndExpiresAtBefore(BookingStatus.PENDING, now);

        if (pendingExpiredBookings.isEmpty()) {
            return 0;
        }

        int expiredCount = 0;
        for (Booking booking : pendingExpiredBookings) {
            try {
                releaseTripSeats(booking.getTripId(), booking.getSeatCount());
                booking.setStatus(BookingStatus.EXPIRED);
                booking.setCancelledAt(now);
                booking.setCancelReason("Payment timeout");
                expiredCount++;
            } catch (AppException ex) {
                log.warn("Failed to auto-expire booking {} due to release error: {}", booking.getId(), ex.getMessage());
            }
        }

        bookingRepository.saveAll(pendingExpiredBookings);
        return expiredCount;
    }

    private void reserveTripSeats(String tripId, Integer seatCount) {
        try {
            ApiResponse<TripSeatUpdateResponse> response = tripServiceClient.reserveSeats(
                    TripSeatReserveRequest.builder()
                            .tripId(tripId)
                            .seatCount(seatCount)
                            .build()
            );
            if (response == null || response.getResult() == null) {
                throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
            }
        } catch (FeignException ex) {
            throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
        }
    }

    private void releaseTripSeats(String tripId, Integer seatCount) {
        try {
            ApiResponse<TripSeatUpdateResponse> response = tripServiceClient.releaseSeats(
                    TripSeatReleaseRequest.builder()
                            .tripId(tripId)
                            .seatCount(seatCount)
                            .build()
            );
            if (response == null || response.getResult() == null) {
                throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
            }
        } catch (FeignException ex) {
            throw new AppException(ErrorCode.TRIP_SERVICE_UNAVAILABLE);
        }
    }

    private void ensurePendingStatus(Booking booking) {
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            throw new AppException(ErrorCode.BOOKING_ALREADY_CONFIRMED);
        }
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new AppException(ErrorCode.BOOKING_ALREADY_CANCELLED);
        }
        if (booking.getStatus() == BookingStatus.EXPIRED) {
            throw new AppException(ErrorCode.BOOKING_EXPIRED);
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new AppException(ErrorCode.BOOKING_NOT_PENDING);
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

    private String resolveCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "anonymous";
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            return jwt.getSubject();
        }

        String authName = authentication.getName();
        return authName == null || authName.isBlank() ? "anonymous" : authName;
    }

    private void publishPaymentRequested(Booking booking, PaymentMethod paymentMethod, LocalDateTime now) {
        PaymentRequestedEvent event = PaymentRequestedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .bookingId(booking.getId())
                .customerId(booking.getCustomerId())
                .tripId(booking.getTripId())
                .seatCount(booking.getSeatCount())
            .amount(booking.getTotalAmount())
            .paymentMethod(paymentMethod.name())
                .createdAt(now)
                .build();

        bookingEventPublisher.publishPaymentRequested(event);
    }

    private BookingResponse toResponse(Booking booking) {
        return BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customerId(booking.getCustomerId())
                .tripId(booking.getTripId())
                .status(booking.getStatus())
                .paymentId(booking.getPaymentId())
                .seatCount(booking.getSeatCount())
                .pricePerSeat(booking.getPricePerSeat())
                .totalAmount(booking.getTotalAmount())
                .pickupLat(booking.getPickupLat())
                .pickupLng(booking.getPickupLng())
                .pickupAddressText(booking.getPickupAddressText())
                .dropoffLat(booking.getDropoffLat())
                .dropoffLng(booking.getDropoffLng())
                .dropoffAddressText(booking.getDropoffAddressText())
                .note(booking.getNote())
                .reservedAt(booking.getReservedAt())
                .expiresAt(booking.getExpiresAt())
                .cancelledAt(booking.getCancelledAt())
                .cancelReason(booking.getCancelReason())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }
}
