package com.rideUp.booking_service.controller;

import com.rideUp.booking_service.dto.response.ApiResponse;
import com.rideUp.booking_service.dto.response.RevenueKpiResponse;
import com.rideUp.booking_service.service.AdminAnalyticsService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

/**
 * ADM-FEAT-02: Báo cáo thống kê doanh thu & xuất Excel đối soát.
 */
@RestController
@RequestMapping("/admin/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminAnalyticsController {

    AdminAnalyticsService analyticsService;

    @GetMapping("/revenue-kpis")
    public ApiResponse<RevenueKpiResponse> getRevenueKpis(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false, defaultValue = "ALL") String paymentMethod) {
        return ApiResponse.<RevenueKpiResponse>builder()
                .result(analyticsService.getRevenueKpis(fromDate, toDate, paymentMethod))
                .build();
    }

    @GetMapping("/export-revenue")
    public ResponseEntity<byte[]> exportRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false, defaultValue = "ALL") String paymentMethod) {
        byte[] file = analyticsService.exportRevenueExcel(fromDate, toDate, paymentMethod);
        String fileName = "rideup-doanh-thu-" + (fromDate != null ? fromDate : "thang-nay")
                + "_" + (toDate != null ? toDate : LocalDate.now()) + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(fileName, StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(file);
    }
}
