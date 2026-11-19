package com.rideup.locationservice.controller;

import com.rideup.locationservice.dto.request.LocationDistanceConfigRequest;
import com.rideup.locationservice.dto.response.ApiResponse;
import com.rideup.locationservice.dto.response.LocationDistanceConfigResponse;
import com.rideup.locationservice.dto.response.MaxDistanceResponse;
import com.rideup.locationservice.service.LocationDistanceConfigService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LocationDistanceConfigController {

    LocationDistanceConfigService distanceConfigService;

    /**
     * API công khai: Mobile App & Web gọi lấy bán kính đón/trả tối đa (theo Tỉnh hoặc Mặc định toàn quốc)
     */
    @GetMapping("/config/max-distance")
    public ApiResponse<MaxDistanceResponse> getMaxDistance(
            @RequestParam(value = "provinceId", required = false) String provinceId) {
        log.info("[LocationDistanceConfigController] Fetching max distance for provinceId={}", provinceId);
        return ApiResponse.<MaxDistanceResponse>builder()
                .message("Lấy bán kính đón/trả tối đa thành công")
                .result(distanceConfigService.getMaxDistance(provinceId))
                .build();
    }

    /**
     * API Admin: Lấy danh sách toàn bộ cấu hình bán kính
     */
    @GetMapping("/admin/distance-configs")
    public ApiResponse<List<LocationDistanceConfigResponse>> getAllConfigs() {
        return ApiResponse.<List<LocationDistanceConfigResponse>>builder()
                .message("Lấy danh sách cấu hình bán kính thành công")
                .result(distanceConfigService.getAllConfigs())
                .build();
    }

    /**
     * API Admin: Tạo cấu hình bán kính mới (Toàn quốc hoặc riêng cho một Tỉnh)
     */
    @PostMapping("/admin/distance-configs")
    public ApiResponse<LocationDistanceConfigResponse> createConfig(
            @Valid @RequestBody LocationDistanceConfigRequest request) {
        return ApiResponse.<LocationDistanceConfigResponse>builder()
                .message("Tạo cấu hình bán kính thành công")
                .result(distanceConfigService.createConfig(request))
                .build();
    }

    /**
     * API Admin: Cập nhật cấu hình bán kính
     */
    @PutMapping("/admin/distance-configs/{id}")
    public ApiResponse<LocationDistanceConfigResponse> updateConfig(
            @PathVariable String id,
            @Valid @RequestBody LocationDistanceConfigRequest request) {
        return ApiResponse.<LocationDistanceConfigResponse>builder()
                .message("Cập nhật cấu hình bán kính thành công")
                .result(distanceConfigService.updateConfig(id, request))
                .build();
    }

    /**
     * API Admin: Xóa cấu hình bán kính
     */
    @DeleteMapping("/admin/distance-configs/{id}")
    public ApiResponse<Void> deleteConfig(@PathVariable String id) {
        distanceConfigService.deleteConfig(id);
        return ApiResponse.<Void>builder()
                .message("Xóa cấu hình bán kính thành công")
                .build();
    }
}

