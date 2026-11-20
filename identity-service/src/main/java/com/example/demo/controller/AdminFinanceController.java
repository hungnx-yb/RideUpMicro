package com.example.demo.controller;

import com.example.demo.dto.request.admin.BroadcastAudienceRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.admin.BroadcastAudienceResponse;
import com.example.demo.dto.response.admin.DebtTransactionResponse;
import com.example.demo.dto.response.admin.DriverDebtResponse;
import com.example.demo.dto.response.admin.FinanceSummaryResponse;
import com.example.demo.service.AdminFinanceService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * ADM-FEAT-02: API công nợ & hoa hồng cho Web Admin (và cho booking-service tổng hợp KPI).
 * ADM-FEAT-04: API lọc người nhận cho notification-service.
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminFinanceController {

    AdminFinanceService adminFinanceService;

    @GetMapping("/finance/summary")
    public ApiResponse<FinanceSummaryResponse> getFinanceSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false, defaultValue = "ALL") String paymentMethod) {
        return ApiResponse.<FinanceSummaryResponse>builder()
                .result(adminFinanceService.getFinanceSummary(fromDate, toDate, paymentMethod))
                .build();
    }

    @GetMapping("/finance/driver-debts")
    public ApiResponse<List<DriverDebtResponse>> getDriverDebts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        List<DriverDebtResponse> result = adminFinanceService.getDriverDebts(keyword, status);
        return ApiResponse.<List<DriverDebtResponse>>builder()
                .result(result)
                .count((long) result.size())
                .build();
    }

    @GetMapping("/finance/driver-debts/{driverUserId}/transactions")
    public ApiResponse<List<DebtTransactionResponse>> getDriverDebtTransactions(@PathVariable String driverUserId) {
        return ApiResponse.<List<DebtTransactionResponse>>builder()
                .result(adminFinanceService.getDriverDebtTransactions(driverUserId))
                .build();
    }

    @PostMapping("/broadcast-audience")
    public ApiResponse<BroadcastAudienceResponse> resolveAudience(
            @RequestBody BroadcastAudienceRequest request,
            @RequestParam(defaultValue = "false") boolean includeUserIds) {
        return ApiResponse.<BroadcastAudienceResponse>builder()
                .result(adminFinanceService.resolveAudience(request, includeUserIds))
                .build();
    }
}
