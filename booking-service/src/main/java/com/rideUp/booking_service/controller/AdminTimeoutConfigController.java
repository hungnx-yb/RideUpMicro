package com.rideUp.booking_service.controller;

import com.rideUp.booking_service.dto.request.UpdateSystemTimeoutRequest;
import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.response.SystemTimeoutConfigResponse;
import com.rideUp.booking_service.service.SystemTimeoutConfigService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ADM-FEAT-03: API quản trị thời gian timeout vận hành (SLA).
 */
@RestController
@RequestMapping("/admin/system-timeouts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminTimeoutConfigController {

    SystemTimeoutConfigService timeoutConfigService;

    @GetMapping
    public ApiResponse<List<SystemTimeoutConfigResponse>> getAll() {
        return ApiResponse.<List<SystemTimeoutConfigResponse>>builder()
                .result(timeoutConfigService.getAll())
                .build();
    }

    @PutMapping("/{configKey}")
    public ApiResponse<SystemTimeoutConfigResponse> update(@PathVariable String configKey,
                                                           @Valid @RequestBody UpdateSystemTimeoutRequest request) {
        return ApiResponse.<SystemTimeoutConfigResponse>builder()
                .message("Cập nhật thời gian timeout thành công")
                .result(timeoutConfigService.update(configKey, request.getValueMinutes()))
                .build();
    }

    @PutMapping
    public ApiResponse<List<SystemTimeoutConfigResponse>> updateAll(
            @RequestBody List<@Valid UpdateSystemTimeoutRequest> requests) {
        return ApiResponse.<List<SystemTimeoutConfigResponse>>builder()
                .message("Lưu toàn bộ thay đổi thành công")
                .result(timeoutConfigService.updateAll(requests))
                .build();
    }

    @PostMapping("/{configKey}/reset")
    public ApiResponse<SystemTimeoutConfigResponse> resetToDefault(@PathVariable String configKey) {
        return ApiResponse.<SystemTimeoutConfigResponse>builder()
                .message("Đã khôi phục giá trị mặc định")
                .result(timeoutConfigService.resetToDefault(configKey))
                .build();
    }
}
