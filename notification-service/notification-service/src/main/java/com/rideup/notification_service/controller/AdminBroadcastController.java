package com.rideup.notification_service.controller;

import com.rideup.notification_service.dto.request.BroadcastAudienceRequest;
import com.rideup.notification_service.dto.request.CreateBroadcastRequest;
import com.rideup.notification_service.dto.response.ApiResponse;
import com.rideup.notification_service.dto.response.BroadcastAudienceResponse;
import com.rideup.notification_service.dto.response.BroadcastCampaignResponse;
import com.rideup.notification_service.service.BroadcastService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ADM-FEAT-04: API trung tâm phát sóng thông báo.
 */
@RestController
@RequestMapping("/admin/broadcasts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminBroadcastController {

    BroadcastService broadcastService;

    @PostMapping("/audience-preview")
    public ApiResponse<BroadcastAudienceResponse> previewAudience(@RequestBody BroadcastAudienceRequest request) {
        return ApiResponse.<BroadcastAudienceResponse>builder()
                .result(broadcastService.previewAudience(request))
                .build();
    }

    @PostMapping("/drafts")
    public ApiResponse<BroadcastCampaignResponse> saveDraft(@Valid @RequestBody CreateBroadcastRequest request) {
        return ApiResponse.<BroadcastCampaignResponse>builder()
                .message("Đã lưu bản nháp")
                .result(broadcastService.saveDraft(request))
                .build();
    }

    @PostMapping("/send-now")
    public ApiResponse<BroadcastCampaignResponse> sendNow(@Valid @RequestBody CreateBroadcastRequest request) {
        return ApiResponse.<BroadcastCampaignResponse>builder()
                .message("Phát sóng thông báo thành công")
                .result(broadcastService.sendNow(request))
                .build();
    }

    @GetMapping
    public ApiResponse<List<BroadcastCampaignResponse>> getCampaigns() {
        return ApiResponse.<List<BroadcastCampaignResponse>>builder()
                .result(broadcastService.getRecentCampaigns())
                .build();
    }
}
