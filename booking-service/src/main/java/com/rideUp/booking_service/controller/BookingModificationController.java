package com.rideUp.booking_service.controller;

import com.rideUp.booking_service.dto.request.RejectBookingModificationRequest;
import com.rideUp.booking_service.dto.request.RequestBookingModificationRequest;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.response.BookingModificationResponse;
import com.rideUp.booking_service.service.BookingModificationService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookingModificationController {

    BookingModificationService bookingModificationService;

    /**
     * Khách hàng gửi yêu cầu chỉnh sửa lộ trình/thông tin chuyến đi
     */
    @PostMapping("/{bookingId}/modify")
    public ApiResponse<BookingModificationResponse> requestModification(
            @PathVariable String bookingId,
            @Valid @RequestBody RequestBookingModificationRequest request
    ) {
        BookingModificationResponse response = bookingModificationService.requestModification(bookingId, request);
        return ApiResponse.<BookingModificationResponse>builder()
                .code(1000)
                .message("Gửi yêu cầu chỉnh sửa thành công. Vui lòng chờ tài xế duyệt.")
                .result(response)
                .build();
    }

    /**
     * Tài xế phê duyệt yêu cầu chỉnh sửa
     */
    @PostMapping("/modifications/{modificationId}/approve")
    public ApiResponse<BookingModificationResponse> approveModification(
            @PathVariable String modificationId
    ) {
        BookingModificationResponse response = bookingModificationService.approveModification(modificationId);
        return ApiResponse.<BookingModificationResponse>builder()
                .code(1000)
                .message("Phê duyệt thay đổi thành công. Lộ trình chuyến đi đã được cập nhật.")
                .result(response)
                .build();
    }

    /**
     * Tài xế từ chối yêu cầu chỉnh sửa
     */
    @PostMapping("/modifications/{modificationId}/reject")
    public ApiResponse<BookingModificationResponse> rejectModification(
            @PathVariable String modificationId,
            @Valid @RequestBody RejectBookingModificationRequest request
    ) {
        BookingModificationResponse response = bookingModificationService.rejectModification(modificationId, request);
        return ApiResponse.<BookingModificationResponse>builder()
                .code(1000)
                .message("Đã từ chối yêu cầu chỉnh sửa. Thông tin vé cũ được giữ nguyên.")
                .result(response)
                .build();
    }

    /**
     * Lấy danh sách lịch sử các lần yêu cầu chỉnh sửa của một booking
     */
    @GetMapping("/{bookingId}/modifications")
    public ApiResponse<List<BookingModificationResponse>> getModificationsByBooking(
            @PathVariable String bookingId
    ) {
        List<BookingModificationResponse> responses = bookingModificationService.getModificationsByBooking(bookingId);
        return ApiResponse.<List<BookingModificationResponse>>builder()
                .code(1000)
                .count((long) responses.size())
                .result(responses)
                .build();
    }

    /**
     * Lấy danh sách các yêu cầu chỉnh sửa đang chờ duyệt theo chuyến xe (tripId)
     */
    @GetMapping("/trip/{tripId}/pending-modifications")
    public ApiResponse<List<BookingModificationResponse>> getPendingModificationsByTrip(
            @PathVariable String tripId
    ) {
        List<BookingModificationResponse> responses = bookingModificationService.getPendingModificationsByTrip(tripId);
        return ApiResponse.<List<BookingModificationResponse>>builder()
                .code(1000)
                .count((long) responses.size())
                .result(responses)
                .build();
    }
}
