package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.event.BookingModificationRequestedEvent;
import com.rideUp.booking_service.dto.event.BookingModificationResolvedEvent;
import com.rideUp.booking_service.dto.request.RejectBookingModificationRequest;
import com.rideUp.booking_service.dto.request.RequestBookingModificationRequest;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.response.BookingModificationResponse;
import com.rideUp.booking_service.dto.response.TripResponse;
import com.rideUp.booking_service.entity.Booking;
import com.rideUp.booking_service.entity.BookingModification;
import com.rideUp.booking_service.enums.BookingStatus;
import com.rideUp.booking_service.enums.ModificationStatus;
import com.rideUp.booking_service.exception.AppException;
import com.rideUp.booking_service.exception.ErrorCode;
import com.rideUp.booking_service.feignClient.TripServiceClient;
import com.rideUp.booking_service.kafka.producer.BookingServicePublisher;
import com.rideUp.booking_service.repository.BookingModificationRepository;
import com.rideUp.booking_service.repository.BookingRepository;
import com.rideUp.booking_service.utils.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingModificationService {

    BookingRepository bookingRepository;
    BookingModificationRepository bookingModificationRepository;
    TripServiceClient tripServiceClient;
    BookingServicePublisher bookingServicePublisher;

    /**
     * Khách hàng gửi yêu cầu chỉnh sửa lộ trình/thông tin chuyến đi
     */
    @Transactional
    public BookingModificationResponse requestModification(String bookingId, RequestBookingModificationRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        String currentUserId = SecurityUtils.getCurrentUserId();
        if (!"anonymous".equals(currentUserId) && !currentUserId.equals(booking.getCustomerId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Quy tắc 1: Trạng thái vé hợp lệ (chỉ CONFIRMED hoặc WAITING_DRIVER_APPROVAL)
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.WAITING_DRIVER_APPROVAL) {
            throw new AppException(ErrorCode.MODIFICATION_INVALID_STATUS);
        }

        // Quy tắc 3: Kiểm soát tính duy nhất (không có yêu cầu pending khác)
        if (bookingModificationRepository.existsByBookingIdAndStatus(bookingId, ModificationStatus.PENDING_DRIVER)) {
            throw new AppException(ErrorCode.MODIFICATION_ALREADY_PENDING);
        }

        // Quy tắc 3: Giới hạn tối đa 2 lần chỉnh sửa thành công
        long approvedCount = bookingModificationRepository.countByBookingIdAndStatus(bookingId, ModificationStatus.APPROVED);
        if (approvedCount >= 2) {
            throw new AppException(ErrorCode.MAX_MODIFICATIONS_EXCEEDED);
        }

        // Quy tắc 2: Cut-off time >= 2 tiếng trước giờ xuất phát
        TripResponse trip = null;
        try {
            ApiResponse<TripResponse> tripRes = tripServiceClient.getTripById(booking.getTripId());
            if (tripRes != null && tripRes.getResult() != null) {
                trip = tripRes.getResult();
            }
        } catch (Exception e) {
            log.warn("Không thể tải thông tin tripId={}: {}", booking.getTripId(), e.getMessage());
        }

        LocalDateTime now = LocalDateTime.now();
        if (trip != null && trip.getDepartureTime() != null) {
            if (trip.getDepartureTime().isBefore(now.plusHours(2))) {
                throw new AppException(ErrorCode.MODIFICATION_CUTOFF_EXCEEDED);
            }
        }

        // Quy tắc 4: Thời hạn phản hồi tối đa 15 phút (hoặc 30 phút trước giờ xuất phát)
        LocalDateTime expiresAt = now.plusMinutes(15);
        if (trip != null && trip.getDepartureTime() != null) {
            LocalDateTime thirtyMinsBefore = trip.getDepartureTime().minusMinutes(30);
            if (thirtyMinsBefore.isBefore(expiresAt)) {
                expiresAt = thirtyMinsBefore;
            }
        }

        // Tạo bản ghi BookingModification snapshot dữ liệu cũ & mới
        BookingModification modification = BookingModification.builder()
                .bookingId(booking.getId())
                .customerId(booking.getCustomerId())
                .tripId(booking.getTripId())
                // Snapshot cũ
                .oldPickupAddressText(booking.getPickupAddressText())
                .oldPickupLat(booking.getPickupLat())
                .oldPickupLng(booking.getPickupLng())
                .oldDropoffAddressText(booking.getDropoffAddressText())
                .oldDropoffLat(booking.getDropoffLat())
                .oldDropoffLng(booking.getDropoffLng())
                .oldNote(booking.getNote())
                // Dữ liệu mới đề xuất
                .newPickupAddressText(request.getPickupAddressText())
                .newPickupLat(request.getPickupLat())
                .newPickupLng(request.getPickupLng())
                .newPickupWardId(request.getPickupWardId())
                .newDropoffAddressText(request.getDropoffAddressText())
                .newDropoffLat(request.getDropoffLat())
                .newDropoffLng(request.getDropoffLng())
                .newDropoffWardId(request.getDropoffWardId())
                .newPassengerName(request.getPassengerName())
                .newPassengerPhone(request.getPassengerPhone())
                .newNote(request.getNote())
                .status(ModificationStatus.PENDING_DRIVER)
                .expiresAt(expiresAt)
                .build();

        BookingModification saved = bookingModificationRepository.save(modification);
        log.info("Khách hàng {} tạo yêu cầu sửa bookingId={}, modId={}, expiresAt={}",
                currentUserId, bookingId, saved.getId(), expiresAt);

        // Bắn sự kiện Kafka thông báo cho tài xế
        String driverId = trip != null ? trip.getDriverId() : null;
        try {
            bookingServicePublisher.publishBookingModificationRequested(
                    BookingModificationRequestedEvent.builder()
                            .eventId(UUID.randomUUID().toString())
                            .modificationId(saved.getId())
                            .bookingId(booking.getId())
                            .customerId(booking.getCustomerId())
                            .tripId(booking.getTripId())
                            .driverId(driverId)
                            .newPickupAddress(saved.getNewPickupAddressText())
                            .newDropoffAddress(saved.getNewDropoffAddressText())
                            .expiresAt(saved.getExpiresAt())
                            .correlationId(UUID.randomUUID().toString())
                            .build()
            );
        } catch (Exception e) {
            log.error("Lỗi bắn Kafka BookingModificationRequestedEvent: {}", e.getMessage());
        }

        return toResponse(saved);
    }

    /**
     * Tài xế phê duyệt yêu cầu chỉnh sửa (APPROVE)
     */
    @Transactional
    public BookingModificationResponse approveModification(String modificationId) {
        BookingModification modification = bookingModificationRepository.findById(modificationId)
                .orElseThrow(() -> new AppException(ErrorCode.MODIFICATION_NOT_FOUND));

        if (modification.getStatus() != ModificationStatus.PENDING_DRIVER) {
            throw new AppException(ErrorCode.MODIFICATION_ALREADY_RESOLVED);
        }

        LocalDateTime now = LocalDateTime.now();
        if (modification.getExpiresAt().isBefore(now)) {
            modification.setStatus(ModificationStatus.EXPIRED);
            modification.setResolvedAt(now);
            bookingModificationRepository.save(modification);
            throw new AppException(ErrorCode.MODIFICATION_ALREADY_RESOLVED);
        }

        Booking booking = bookingRepository.findById(modification.getBookingId())
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));

        // Kiểm tra quyền tài xế của chuyến
        String currentUserId = SecurityUtils.getCurrentUserId();
        TripResponse trip = null;
        try {
            ApiResponse<TripResponse> tripRes = tripServiceClient.getTripById(modification.getTripId());
            if (tripRes != null && tripRes.getResult() != null) {
                trip = tripRes.getResult();
                if (!"anonymous".equals(currentUserId) && trip.getDriverId() != null && !currentUserId.equals(trip.getDriverId())) {
                    throw new AppException(ErrorCode.UNAUTHORIZED);
                }
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Không thể xác minh tài xế tripId={}: {}", modification.getTripId(), e.getMessage());
        }

        // Cập nhật thông tin mới vào Booking
        booking.setPickupAddressText(modification.getNewPickupAddressText());
        booking.setPickupLat(modification.getNewPickupLat());
        booking.setPickupLng(modification.getNewPickupLng());
        booking.setPickupWardId(modification.getNewPickupWardId());

        booking.setDropoffAddressText(modification.getNewDropoffAddressText());
        booking.setDropoffLat(modification.getNewDropoffLat());
        booking.setDropoffLng(modification.getNewDropoffLng());
        booking.setDropoffWardId(modification.getNewDropoffWardId());

        // Nếu có đổi tên/SĐT người đi, gắn thông tin vào note
        if (StringUtils.hasText(modification.getNewPassengerPhone())) {
            String passengerInfo = "[Người đi: " + (modification.getNewPassengerName() != null ? modification.getNewPassengerName() : "Khách")
                    + " - " + modification.getNewPassengerPhone() + "]";
            String baseNote = modification.getNewNote() != null ? modification.getNewNote() : "";
            booking.setNote(passengerInfo + " " + baseNote);
        } else if (modification.getNewNote() != null) {
            booking.setNote(modification.getNewNote());
        }

        bookingRepository.save(booking);

        // Cập nhật trạng thái Modification
        modification.setStatus(ModificationStatus.APPROVED);
        modification.setResolvedAt(now);
        BookingModification saved = bookingModificationRepository.save(modification);
        log.info("Tài xế {} duyệt yêu cầu modificationId={}, bookingId={}", currentUserId, modificationId, booking.getId());

        // Bắn sự kiện Kafka thông báo khách hàng
        try {
            bookingServicePublisher.publishBookingModificationResolved(
                    BookingModificationResolvedEvent.builder()
                            .eventId(UUID.randomUUID().toString())
                            .modificationId(saved.getId())
                            .bookingId(booking.getId())
                            .customerId(booking.getCustomerId())
                            .tripId(booking.getTripId())
                            .driverId(trip != null ? trip.getDriverId() : null)
                            .status(ModificationStatus.APPROVED)
                            .resolvedAt(saved.getResolvedAt())
                            .correlationId(UUID.randomUUID().toString())
                            .build()
            );
        } catch (Exception e) {
            log.error("Lỗi bắn Kafka BookingModificationResolvedEvent (APPROVED): {}", e.getMessage());
        }

        return toResponse(saved);
    }

    /**
     * Tài xế từ chối yêu cầu chỉnh sửa (REJECT)
     */
    @Transactional
    public BookingModificationResponse rejectModification(String modificationId, RejectBookingModificationRequest request) {
        BookingModification modification = bookingModificationRepository.findById(modificationId)
                .orElseThrow(() -> new AppException(ErrorCode.MODIFICATION_NOT_FOUND));

        if (modification.getStatus() != ModificationStatus.PENDING_DRIVER) {
            throw new AppException(ErrorCode.MODIFICATION_ALREADY_RESOLVED);
        }

        String currentUserId = SecurityUtils.getCurrentUserId();
        TripResponse trip = null;
        try {
            ApiResponse<TripResponse> tripRes = tripServiceClient.getTripById(modification.getTripId());
            if (tripRes != null && tripRes.getResult() != null) {
                trip = tripRes.getResult();
                if (!"anonymous".equals(currentUserId) && trip.getDriverId() != null && !currentUserId.equals(trip.getDriverId())) {
                    throw new AppException(ErrorCode.UNAUTHORIZED);
                }
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Không thể xác minh tài xế tripId={}: {}", modification.getTripId(), e.getMessage());
        }

        LocalDateTime now = LocalDateTime.now();
        modification.setStatus(ModificationStatus.REJECTED);
        modification.setRejectionReason(request.getReason());
        modification.setResolvedAt(now);
        BookingModification saved = bookingModificationRepository.save(modification);
        log.info("Tài xế {} từ chối yêu cầu modificationId={}, lý do={}", currentUserId, modificationId, request.getReason());

        // Bắn sự kiện Kafka thông báo khách hàng
        try {
            bookingServicePublisher.publishBookingModificationResolved(
                    BookingModificationResolvedEvent.builder()
                            .eventId(UUID.randomUUID().toString())
                            .modificationId(saved.getId())
                            .bookingId(modification.getBookingId())
                            .customerId(modification.getCustomerId())
                            .tripId(modification.getTripId())
                            .driverId(trip != null ? trip.getDriverId() : null)
                            .status(ModificationStatus.REJECTED)
                            .reason(request.getReason())
                            .resolvedAt(saved.getResolvedAt())
                            .correlationId(UUID.randomUUID().toString())
                            .build()
            );
        } catch (Exception e) {
            log.error("Lỗi bắn Kafka BookingModificationResolvedEvent (REJECTED): {}", e.getMessage());
        }

        return toResponse(saved);
    }

    /**
     * Lấy lịch sử chỉnh sửa của một booking
     */
    public List<BookingModificationResponse> getModificationsByBooking(String bookingId) {
        return bookingModificationRepository.findByBookingIdOrderByCreatedAtDesc(bookingId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách các yêu cầu chỉnh sửa đang chờ duyệt theo tripId
     */
    public List<BookingModificationResponse> getPendingModificationsByTrip(String tripId) {
        return bookingModificationRepository.findByTripIdAndStatus(tripId, ModificationStatus.PENDING_DRIVER)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách các yêu cầu chỉnh sửa đang chờ duyệt cho tài xế
     */
    public List<BookingModificationResponse> getPendingModificationsForDriver(List<String> tripIds) {
        if (tripIds == null || tripIds.isEmpty()) {
            return Collections.emptyList();
        }
        return bookingModificationRepository.findByTripIdInAndStatus(tripIds, ModificationStatus.PENDING_DRIVER)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Scheduled Job quét định kỳ mỗi 60 giây để expire các yêu cầu quá hạn 15 phút
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void expirePendingModifications() {
        LocalDateTime now = LocalDateTime.now();
        List<BookingModification> expiredList = bookingModificationRepository
                .findByStatusAndExpiresAtLessThanEqual(ModificationStatus.PENDING_DRIVER, now);

        if (expiredList.isEmpty()) {
            return;
        }

        log.info("Quét timeout: tìm thấy {} yêu cầu chỉnh sửa quá hạn 15 phút", expiredList.size());
        for (BookingModification mod : expiredList) {
            mod.setStatus(ModificationStatus.EXPIRED);
            mod.setResolvedAt(now);
            bookingModificationRepository.save(mod);

            try {
                bookingServicePublisher.publishBookingModificationResolved(
                        BookingModificationResolvedEvent.builder()
                                .eventId(UUID.randomUUID().toString())
                                .modificationId(mod.getId())
                                .bookingId(mod.getBookingId())
                                .customerId(mod.getCustomerId())
                                .tripId(mod.getTripId())
                                .status(ModificationStatus.EXPIRED)
                                .reason("Yêu cầu hết hạn do tài xế không phản hồi trong 15 phút")
                                .resolvedAt(now)
                                .correlationId(UUID.randomUUID().toString())
                                .build()
                );
            } catch (Exception e) {
                log.error("Lỗi bắn Kafka BookingModificationResolvedEvent (EXPIRED) cho modId={}: {}", mod.getId(), e.getMessage());
            }
        }
    }

    private BookingModificationResponse toResponse(BookingModification m) {
        return BookingModificationResponse.builder()
                .id(m.getId())
                .bookingId(m.getBookingId())
                .customerId(m.getCustomerId())
                .tripId(m.getTripId())
                .newPickupAddressText(m.getNewPickupAddressText())
                .newPickupLat(m.getNewPickupLat())
                .newPickupLng(m.getNewPickupLng())
                .newPickupWardId(m.getNewPickupWardId())
                .newDropoffAddressText(m.getNewDropoffAddressText())
                .newDropoffLat(m.getNewDropoffLat())
                .newDropoffLng(m.getNewDropoffLng())
                .newDropoffWardId(m.getNewDropoffWardId())
                .newPassengerName(m.getNewPassengerName())
                .newPassengerPhone(m.getNewPassengerPhone())
                .newNote(m.getNewNote())
                .oldPickupAddressText(m.getOldPickupAddressText())
                .oldPickupLat(m.getOldPickupLat())
                .oldPickupLng(m.getOldPickupLng())
                .oldDropoffAddressText(m.getOldDropoffAddressText())
                .oldDropoffLat(m.getOldDropoffLat())
                .oldDropoffLng(m.getOldDropoffLng())
                .oldPassengerName(m.getOldPassengerName())
                .oldPassengerPhone(m.getOldPassengerPhone())
                .oldNote(m.getOldNote())
                .status(m.getStatus())
                .rejectionReason(m.getRejectionReason())
                .expiresAt(m.getExpiresAt())
                .resolvedAt(m.getResolvedAt())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
