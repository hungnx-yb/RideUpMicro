package com.rideup.trip_service.controller;

import com.rideup.trip_service.dto.request.UpdateFareBoundaryRequest;
import com.rideup.trip_service.dto.response.ApiResponse;
import com.rideup.trip_service.dto.response.FareBoundaryResponse;
import com.rideup.trip_service.dto.response.FareEstimateResponse;
import com.rideup.trip_service.service.FareBoundaryService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * ADM-FEAT-05: Cấu hình khung giá cước theo km.
 */
@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FareBoundaryController {

    FareBoundaryService fareBoundaryService;

    @GetMapping("/admin/fare-boundaries")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FareBoundaryResponse> getConfig() {
        return ApiResponse.<FareBoundaryResponse>builder()
                .result(fareBoundaryService.getConfig())
                .build();
    }

    @PutMapping("/admin/fare-boundaries")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FareBoundaryResponse> updateConfig(@Valid @RequestBody UpdateFareBoundaryRequest request) {
        return ApiResponse.<FareBoundaryResponse>builder()
                .message("Cập nhật khung giá cước thành công")
                .result(fareBoundaryService.updateConfig(request))
                .build();
    }

    /** Dùng cho Admin (xem trước) và app tài xế (gợi ý giá khi tạo chuyến). */
    @GetMapping("/fare-boundaries/estimate")
    public ApiResponse<FareEstimateResponse> estimate(@RequestParam String startProvinceId,
                                                      @RequestParam String endProvinceId) {
        return ApiResponse.<FareEstimateResponse>builder()
                .result(fareBoundaryService.estimate(startProvinceId, endProvinceId))
                .build();
    }
}
