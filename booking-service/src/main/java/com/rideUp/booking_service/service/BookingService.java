package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.request.*;
import com.rideUp.booking_service.dto.event.BookingCancelledEvent;
import com.rideUp.booking_service.dto.event.BookingConfirmedEvent;
import com.rideUp.booking_service.dto.event.PaymentRequestedEvent;
import com.rideUp.booking_service.dto.response.BookingResponse;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.entity.Booking;
import com.rideUp.booking_service.enums.BookingStatus;
import com.rideUp.booking_service.enums.PaymentMethod;
import com.rideUp.booking_service.enums.PaymentStatus;
import com.rideUp.booking_service.exception.AppException;
import com.rideUp.booking_service.exception.ErrorCode;
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
    BookingServicePublisher bookingServicePublisher;
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
        return modelMapper.map(saved, BookingResponse.class);
    }

    @Transactional
    public BookingResponse handlePaymentCompleted(PaymentCompletedRequest request) {
        log.info("Handling payment completed for bookingId={}, paymentId={}, correlationId={}",
            request.getBookingId(), request.getPaymentId(), request.getCorrelationId());

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return modelMapper.map(booking, BookingResponse.class);
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            return modelMapper.map(booking, BookingResponse.class);
        }

        booking.setPaymentId(request.getPaymentId());
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setExpiresAt(null);
        booking.setCancelReason(null);
        booking.setCancelledAt(null);

        Booking saved = bookingRepository.save(booking);
        publishBookingConfirmed(saved, request.getCorrelationId());

        return modelMapper.map(saved, BookingResponse.class);
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

        Booking saved = bookingRepository.save(booking);
        publishBookingCancelled(saved, request.getCorrelationId(), saved.getCancelReason());
        return modelMapper.map(saved, BookingResponse.class);
    }



    public BookingResponse getBookingDetail(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        return modelMapper.map(booking, BookingResponse.class);
    }

    public List<BookingResponse> getMyBookings() {
        String customerId =SecurityUtils.getCurrentUserId();
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(booking -> modelMapper.map(booking, BookingResponse.class))
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
                booking.setStatus(BookingStatus.EXPIRED);
                publishBookingCancelled(booking, UUID.randomUUID().toString(), booking.getCancelReason());
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
