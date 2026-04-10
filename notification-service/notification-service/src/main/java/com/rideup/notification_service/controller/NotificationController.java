package com.rideup.notification_service.controller;

import com.rideup.notification_service.dto.response.ApiResponse;
import com.rideup.notification_service.dto.response.NotificationResponse;
import com.rideup.notification_service.service.NotificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationController {

    NotificationService notificationService;

    @GetMapping("/my")
    public ApiResponse<List<NotificationResponse>> getMyNotifications(
            Pageable pageable,
            @RequestParam(required = false) String status

    ) {
        Slice<NotificationResponse> page = notificationService.getMyNotifications(pageable, status);
        return ApiResponse.<List<NotificationResponse>>builder()
                .result(page.getContent())
                .count((long) page.getNumberOfElements())
                .message("Notifications retrieved successfully")
                .build();
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount() {
        return ApiResponse.<Long>builder()
                .result(notificationService.getUnreadCount())
                .message("Unread count retrieved successfully")
                .build();
    }

    @PostMapping("/{id}/read")
    public ApiResponse<NotificationResponse> markRead(@PathVariable String id) {
        return ApiResponse.<NotificationResponse>builder()
                .result(notificationService.markRead(id))
                .message("Notification marked as read")
                .build();
    }

    @PostMapping("/read-all")
    public ApiResponse<Integer> markAllRead() {
        return ApiResponse.<Integer>builder()
                .result(notificationService.markAllRead())
                .message("All notifications marked as read")
                .build();
    }
}
