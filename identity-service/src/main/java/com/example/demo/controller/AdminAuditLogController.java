package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.admin.AdminAuditLogResponse;
import com.example.demo.dto.response.admin.PageResult;
import com.example.demo.service.AdminAuditLogService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * ADM-FEAT-06: Tra cứu nhật ký kiểm toán hành động quản trị.
 */
@RestController
@RequestMapping("/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminAuditLogController {

    AdminAuditLogService auditLogService;

    @GetMapping
    public ApiResponse<PageResult<AdminAuditLogResponse>> searchAuditLogs(
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<PageResult<AdminAuditLogResponse>>builder()
                .result(auditLogService.search(serviceName, action, keyword, fromDate, toDate, page, size))
                .build();
    }
}
