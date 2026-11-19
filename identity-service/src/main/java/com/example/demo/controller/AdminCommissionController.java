package com.example.demo.controller;

import com.example.demo.dto.request.driver.CommissionConfigUpdateRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.driver.CommissionConfigResponse;
import com.example.demo.service.CommissionService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/commission-config")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminCommissionController {

    CommissionService commissionService;

    @GetMapping
    public ApiResponse<CommissionConfigResponse> getCommissionConfig() {
        return ApiResponse.<CommissionConfigResponse>builder()
                .result(commissionService.getCommissionConfig())
                .message("Commission config retrieved successfully")
                .build();
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CommissionConfigResponse> updateCommissionConfig(
            @Valid @RequestBody CommissionConfigUpdateRequest request) {
        return ApiResponse.<CommissionConfigResponse>builder()
                .result(commissionService.updateCommissionConfig(request))
                .message("Commission config updated successfully")
                .build();
    }
}
