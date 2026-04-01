package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.request.CancelBookingRequest;
import com.rideUp.booking_service.dto.request.CreateBookingRequest;
import com.rideUp.booking_service.dto.request.PaymentCompletedRequest;
import com.rideUp.booking_service.dto.request.PaymentFailedRequest;
import com.rideUp.booking_service.dto.event.BookingCancelledEvent;
import com.rideUp.booking_service.dto.event.BookingConfirmedEvent;
import com.rideUp.booking_service.dto.event.SeatReleaseEvent;
import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
import com.rideUp.booking_service.dto.response.BookingResponse;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.request.SeatReleaseRequest;
import com.rideUp.booking_service.dto.request.SeatReserveRequest;
import com.rideUp.booking_service.dto.request.SeatResponse;
import com.rideUp.booking_service.entity.Booking;
import com.rideUp.booking_service.enums.BookingStatus;
import com.rideUp.booking_service.enums.PaymentMethod;
import com.rideUp.booking_service.enums.PaymentStatus;
import com.rideUp.booking_service.exception.AppException;
import com.rideUp.booking_service.exception.ErrorCode;
import com.rideUp.booking_service.feignClient.TripServiceClient;
import com.rideUp.booking_service.kafka.producer.BookingEventPublisher;
import com.rideUp.booking_service.repository.BookingRepository;
import com.rideUp.booking_service.utils.SecurityUtils;
import feign.FeignException;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.conn.scheme.SchemeRegistry;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
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
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingService {

    static DateTimeFormatter CODE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    BookingRepository bookingRepository;
    TripServiceClient tripServiceClient;
    BookingEventPublisher bookingEventPublisher;
    ModelMapper modelMapper;

    @NonFinal
    @Value("${expiryTime:3600}")
    long expirySeconds;

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request) {
        BigDecimal tripPricePerSeat = reserveTripSeats(request.getTripId(), request.getSeatCount());
        LocalDateTime now = LocalDateTime.now();
        Booking booking = modelMapper.map(request, Booking.class);
        booking.setBookingCode(generateBookingCode());
        booking.setStatus(BookingStatus.PENDING);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        booking.setTotalAmount(tripPricePerSeat.multiply(BigDecimal.valueOf(request.getSeatCount())));
        booking.setReservedAt(now);
        booking.setCustomerId(SecurityUtils.getCurrentUserId());
        booking.setExpiresAt(request.getPaymentMethod() == PaymentMethod.VNPAY ? now.plusSeconds(expirySeconds) : null);
        Booking saved = bookingRepository.save(booking);
        publishPaymentRequested(saved, request.getPaymentMethod(), now);
        return toResponse(saved);
    }

    @Transactional
    public BookingResponse handlePaymentCompleted(PaymentCompletedRequest request) {
        log.info("Handling payment completed for bookingId={}, paymentId={}, correlationId={}",
            request.getBookingId(), request.getPaymentId(), request.getCorrelationId());

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return toResponse(booking);
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            return toResponse(booking);
        }

        booking.setPaymentId(request.getPaymentId());
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setExpiresAt(null);
        booking.setCancelReason(null);
        booking.setCancelledAt(null);

        Booking saved = bookingRepository.save(booking);
        publishBookingConfirmed(saved, request.getCorrelationId());

        return toResponse(saved);
    }

    @Transactional
    public BookingResponse handlePaymentFailed(PaymentFailedRequest request) {
        log.info("Handling payment failed for bookingId={}, paymentId={}, correlationId={}",
            request.getBookingId(), request.getPaymentId(), request.getCorrelationId());

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CANCELLED_PAYMENT_FAILED || booking.getStatus() == BookingStatus.EXPIRED
                || booking.getStatus() == BookingStatus.CANCELLED_USER) {
            return modelMapper.map(booking, BookingResponse.class);
        }

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return toResponse(booking);
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

        Booking saved = bookingRepository.save(booking);
        publishSeatRelease(saved, request.getCorrelationId(), saved.getCancelReason());
        publishBookingCancelled(saved, request.getCorrelationId(), saved.getCancelReason());

        return toResponse(saved);
    }

    public BookingResponse getBookingDetail(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        return toResponse(booking);
    }

    public List<BookingResponse> getMyBookings() {
        String customerId =SecurityUtils.getCurrentUserId();
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(this::toResponse)
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

        Booking saved = bookingRepository.save(booking);
        publishSeatRelease(
            saved,
            UUID.randomUUID().toString(),
            saved.getCancelReason() == null || saved.getCancelReason().isBlank() ? "Cancelled by user" : saved.getCancelReason()
        );
        publishBookingCancelled(
            saved,
            UUID.randomUUID().toString(),
            saved.getCancelReason() == null || saved.getCancelReason().isBlank() ? "Cancelled by user" : saved.getCancelReason()
        );

        return toResponse(saved);
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
                booking.setStatus(BookingStatus.EXPIRED);
                booking.setPaymentStatus(PaymentStatus.FAILED);
                booking.setCancelledAt(now);
                booking.setCancelReason("Payment timeout");

                publishBookingCancelled(
                        booking,
                        UUID.randomUUID().toString(),
                        "Payment timeout"
                );
                publishSeatRelease(booking, UUID.randomUUID().toString(), "Payment timeout");
                expiredCount++;
            } catch (AppException ex) {
                log.warn("Failed to auto-expire booking {} due to release error: {}", booking.getId(), ex.getMessage());
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

    private void publishSeatRelease(Booking booking, String correlationId, String reason) {
        SeatReleaseEvent event = SeatReleaseEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .bookingId(booking.getId())
                .tripId(booking.getTripId())
                .seatCount(booking.getSeatCount())
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build();

        bookingEventPublisher.publishSeatRelease(event);
    }

    private String generateBookingCode() {
        String code = "BK" + LocalDateTime.now().format(CODE_TIME_FORMATTER)
                + ThreadLocalRandom.current().nextInt(1000, 10000);

        if (bookingRepository.findByBookingCode(code).isPresent()) {
            return generateBookingCode();
        }
        return code;
    }


    private void publishPaymentRequested(Booking booking, PaymentMethod paymentMethod, LocalDateTime now) {
        String correlationId = UUID.randomUUID().toString();

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

        bookingEventPublisher.publishPaymentRequested(event);
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

        bookingEventPublisher.publishBookingConfirmed(event);
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

        bookingEventPublisher.publishBookingCancelled(event);
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
                .paymentStatus(booking.getPaymentStatus())
                .pickupLat(booking.getPickupLat())
                .pickupLng(booking.getPickupLng())
                .pickupWardId(booking.getPickupWardId())
                .pickupAddressText(booking.getPickupAddressText())
                .dropoffLat(booking.getDropoffLat())
                .dropoffLng(booking.getDropoffLng())
                .dropoffWardId(booking.getDropoffWardId())
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
