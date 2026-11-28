package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.admin.PageResult;
import com.example.demo.dto.response.user.DriverResponse;
import com.example.demo.service.AdminDriverService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Quản lý tài xế cho Web Admin: danh sách toàn bộ tài xế kèm bộ lọc và phân trang.
 */
@RestController
@RequestMapping("/admin/drivers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminDriverController {

    AdminDriverService adminDriverService;

    @GetMapping
    public ApiResponse<PageResult<DriverResponse>> searchDrivers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "ALL") String vehicleStatus,
            @RequestParam(required = false, defaultValue = "ALL") String lockStatus,
            @RequestParam(required = false, defaultValue = "NEWEST") String sort,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        PageResult<DriverResponse> result = adminDriverService.searchDrivers(
                keyword, status, vehicleStatus, lockStatus, sort, page, size);
        return ApiResponse.<PageResult<DriverResponse>>builder()
                .result(result)
                .count(result.getTotalElements())
                .build();
    }
}
