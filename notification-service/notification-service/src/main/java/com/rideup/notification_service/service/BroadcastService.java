package com.rideup.notification_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.notification_service.constant.RedisPrefixKeyConstant;
import com.rideup.notification_service.dto.request.BroadcastAudienceRequest;
import com.rideup.notification_service.dto.request.CreateBroadcastRequest;
import com.rideup.notification_service.dto.response.BroadcastAudienceResponse;
import com.rideup.notification_service.dto.response.BroadcastCampaignResponse;
import com.rideup.notification_service.entity.BroadcastCampaign;
import com.rideup.notification_service.entity.Notification;
import com.rideup.notification_service.enums.BroadcastStatus;
import com.rideup.notification_service.enums.NotificationStatus;
import com.rideup.notification_service.enums.NotificationType;
import com.rideup.notification_service.exception.AppException;
import com.rideup.notification_service.exception.ErrorCode;
import com.rideup.notification_service.feignClient.IdentityFeignClient;
import com.rideup.notification_service.kafka.producer.AdminAuditPublisher;
import com.rideup.notification_service.repository.BroadcastCampaignRepository;
import com.rideup.notification_service.repository.NotificationRepository;
import com.rideup.notification_service.utils.SecurityUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * ADM-FEAT-04: Trung tâm phát sóng thông báo thủ công đa kênh.
 *
 * Kênh hỗ trợ:
 *  - IN_APP    : bulk insert vào bảng notification để xem lại trong Hòm thư ứng dụng.
 *  - WEBSOCKET : bắn bản tin qua STOMP topic /topic/announcements cho người đang online.
 *  - FCM       : chưa khả dụng (hệ thống chưa thu thập FCM device token & chưa cấu hình Firebase) -> ghi chú bỏ qua.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BroadcastService {

    public static final String ANNOUNCEMENT_TOPIC = "/topic/announcements";
    private static final Set<String> SUPPORTED_CHANNELS = Set.of("IN_APP", "WEBSOCKET", "FCM");
    private static final int BATCH_SIZE = 500;

    BroadcastCampaignRepository campaignRepository;
    NotificationRepository notificationRepository;
    IdentityFeignClient identityFeignClient;
    SimpMessagingTemplate messagingTemplate;
    RedisTemplate<String, Object> redisTemplate;
    ObjectMapper objectMapper;
    AdminAuditPublisher auditPublisher;

    /** Bộ đếm người nhận dự kiến theo thời gian thực */
    public BroadcastAudienceResponse previewAudience(BroadcastAudienceRequest request) {
        return fetchAudience(request, false);
    }

    @Transactional
    public BroadcastCampaignResponse saveDraft(CreateBroadcastRequest request) {
        BroadcastCampaign campaign = request.getCampaignId() != null
                ? findEditable(request.getCampaignId())
                : new BroadcastCampaign();
        applyRequest(campaign, request);
        campaign.setStatus(BroadcastStatus.DRAFT);
        campaign.setCreatedBy(SecurityUtils.getCurrentUserId());
        return toResponse(campaignRepository.save(campaign));
    }

    @Transactional
    public BroadcastCampaignResponse sendNow(CreateBroadcastRequest request) {
        BroadcastCampaign campaign;
        if (request.getCampaignId() != null && !request.getCampaignId().isBlank()) {
            campaign = findEditable(request.getCampaignId());
            if (request.getTitle() != null) {
                applyRequest(campaign, request);
            }
        } else {
            campaign = new BroadcastCampaign();
            applyRequest(campaign, request);
            campaign.setCreatedBy(SecurityUtils.getCurrentUserId());
        }

        List<String> channels = splitCsv(campaign.getChannels());
        if (channels.isEmpty()) {
            throw new AppException(ErrorCode.BROADCAST_NO_CHANNEL);
        }

        // 1. Xác định danh sách người nhận
        List<String> recipients;
        if (request.getTargetUserIds() != null && !request.getTargetUserIds().isEmpty()) {
            recipients = request.getTargetUserIds().stream().filter(Objects::nonNull).distinct().toList();
            campaign.setTargetRole("DIRECT");
        } else {
            BroadcastAudienceResponse audience = fetchAudience(BroadcastAudienceRequest.builder()
                    .targetRole(campaign.getTargetRole())
                    .provinceIds(splitCsv(campaign.getProvinceIds()))
                    .minReputation(campaign.getMinReputation())
                    .maxReputation(campaign.getMaxReputation())
                    .build(), true);
            recipients = audience.getUserIds() != null ? audience.getUserIds() : List.of();
        }
        if (recipients.isEmpty()) {
            throw new AppException(ErrorCode.BROADCAST_NO_RECIPIENT);
        }

        // 2. Ghi nhận chiến dịch ở trạng thái SENDING
        campaign.setStatus(BroadcastStatus.SENDING);
        campaign.setTotalRecipients(recipients.size());
        campaign = campaignRepository.save(campaign);

        // 3. Thực thi đa kênh
        List<String> notes = new ArrayList<>();
        int delivered = 0;
        boolean isDebtReminder = "DEBT_REMINDER".equalsIgnoreCase(request.getCategory());
        try {
            if (channels.contains("IN_APP")) {
                delivered = deliverInApp(campaign, recipients,
                        isDebtReminder ? NotificationType.DEBT_REMINDER : NotificationType.BROADCAST);
                notes.add("IN_APP: " + delivered + "/" + recipients.size());
            }
            if (channels.contains("WEBSOCKET")) {
                deliverWebSocket(campaign, recipients);
                notes.add("WEBSOCKET: đã phát lên " + ANNOUNCEMENT_TOPIC);
                if (!channels.contains("IN_APP")) {
                    delivered = recipients.size();
                }
            }
            if (channels.contains("FCM")) {
                notes.add("FCM: bỏ qua (chưa cấu hình Firebase / chưa có device token)");
            }
            campaign.setStatus(BroadcastStatus.SENT);
        } catch (Exception e) {
            log.error("[Broadcast] Failed to deliver campaign {}: {}", campaign.getId(), e.getMessage(), e);
            notes.add("Lỗi: " + e.getMessage());
            campaign.setStatus(BroadcastStatus.FAILED);
        }

        // 4. Cập nhật kết quả
        campaign.setTotalDelivered(delivered);
        campaign.setDeliveryNote(truncate(String.join(" | ", notes), 500));
        campaign.setSentAt(LocalDateTime.now());
        BroadcastCampaign saved = campaignRepository.save(campaign);

        auditPublisher.publish("SEND_BROADCAST", "BROADCAST_CAMPAIGN", saved.getId(),
                "Phát sóng thông báo \"" + saved.getTitle() + "\" tới " + recipients.size() + " người nhận",
                null, Map.of(
                        "title", saved.getTitle(),
                        "targetRole", saved.getTargetRole(),
                        "channels", channels,
                        "totalRecipients", recipients.size(),
                        "status", saved.getStatus().name()));
        log.info("[Broadcast] Campaign {} {}: {}", saved.getId(), saved.getStatus(), saved.getDeliveryNote());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BroadcastCampaignResponse> getRecentCampaigns() {
        return campaignRepository.findTop50ByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    // ===================== Kênh phát sóng =====================

    private int deliverInApp(BroadcastCampaign campaign, List<String> recipients, NotificationType type) {
        String message = campaign.getContent() != null && !campaign.getContent().isBlank()
                ? campaign.getContent() : campaign.getSummary();
        String metadata = buildMetadata(campaign);

        int delivered = 0;
        for (int i = 0; i < recipients.size(); i += BATCH_SIZE) {
            List<String> batch = recipients.subList(i, Math.min(i + BATCH_SIZE, recipients.size()));
            List<Notification> notifications = batch.stream()
                    .map(userId -> Notification.builder()
                            .userId(userId)
                            .title(truncate(campaign.getTitle(), 200))
                            .message(message)
                            .type(type)
                            .status(NotificationStatus.UNREAD)
                            .metadata(metadata)
                            .build())
                    .toList();
            notificationRepository.saveAll(notifications);
            delivered += notifications.size();

            // Xóa cache đếm chưa đọc để lần gọi sau tính lại chính xác
            try {
                redisTemplate.delete(batch.stream()
                        .map(userId -> RedisPrefixKeyConstant.UNRED_NOTIFICATION + userId)
                        .toList());
            } catch (Exception e) {
                log.warn("[Broadcast] Cannot evict unread counters: {}", e.getMessage());
            }
        }
        return delivered;
    }

    private void deliverWebSocket(BroadcastCampaign campaign, List<String> recipients) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("campaignId", campaign.getId());
        payload.put("title", campaign.getTitle());
        payload.put("summary", campaign.getSummary());
        payload.put("content", campaign.getContent());
        payload.put("deepLink", campaign.getDeepLink());
        payload.put("targetRole", campaign.getTargetRole());
        payload.put("sentAt", LocalDateTime.now().toString());

        if ("DIRECT".equals(campaign.getTargetRole())) {
            // Gửi riêng từng người (vd: nhắc nợ) để người khác không nhận được
            recipients.forEach(userId -> messagingTemplate.convertAndSendToUser(userId, "/queue/announcements", payload));
        } else {
            // Client tự lọc theo vai trò (targetRole) khi hiển thị popup
            messagingTemplate.convertAndSend(ANNOUNCEMENT_TOPIC, payload);
        }
    }

    // ===================== Helpers =====================

    private BroadcastAudienceResponse fetchAudience(BroadcastAudienceRequest request, boolean includeUserIds) {
        try {
            var response = identityFeignClient.resolveAudience(request, includeUserIds);
            if (response == null || response.getResult() == null) {
                throw new AppException(ErrorCode.AUDIENCE_SERVICE_UNAVAILABLE);
            }
            return response.getResult();
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Broadcast] Cannot resolve audience: {}", e.getMessage());
            throw new AppException(ErrorCode.AUDIENCE_SERVICE_UNAVAILABLE);
        }
    }

    private BroadcastCampaign findEditable(String campaignId) {
        BroadcastCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new AppException(ErrorCode.BROADCAST_NOT_FOUND));
        if (campaign.getStatus() != BroadcastStatus.DRAFT) {
            throw new AppException(ErrorCode.BROADCAST_ALREADY_SENT);
        }
        return campaign;
    }

    private void applyRequest(BroadcastCampaign campaign, CreateBroadcastRequest request) {
        campaign.setTitle(request.getTitle());
        campaign.setSummary(request.getSummary());
        campaign.setContent(request.getContent());
        campaign.setDeepLink(request.getDeepLink());
        String role = request.getTargetRole() == null ? "ALL" : request.getTargetRole().trim().toUpperCase();
        campaign.setTargetRole(Set.of("ALL", "DRIVER", "CUSTOMER").contains(role) ? role : "ALL");
        boolean isDriver = "DRIVER".equals(campaign.getTargetRole());
        campaign.setProvinceIds(isDriver ? joinCsv(request.getProvinceIds()) : null);
        campaign.setMinReputation(isDriver ? request.getMinReputation() : null);
        campaign.setMaxReputation(isDriver ? request.getMaxReputation() : null);
        List<String> channels = request.getChannels() == null ? List.of() : request.getChannels().stream()
                .filter(Objects::nonNull)
                .map(c -> c.trim().toUpperCase())
                .filter(SUPPORTED_CHANNELS::contains)
                .distinct()
                .toList();
        campaign.setChannels(String.join(",", channels));
    }

    private String buildMetadata(BroadcastCampaign campaign) {
        try {
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("campaignId", campaign.getId());
            meta.put("summary", campaign.getSummary());
            meta.put("deepLink", campaign.getDeepLink());
            return objectMapper.writeValueAsString(meta);
        } catch (Exception e) {
            return null;
        }
    }

    private BroadcastCampaignResponse toResponse(BroadcastCampaign c) {
        return BroadcastCampaignResponse.builder()
                .id(c.getId())
                .title(c.getTitle())
                .summary(c.getSummary())
                .content(c.getContent())
                .deepLink(c.getDeepLink())
                .targetRole(c.getTargetRole())
                .provinceIds(splitCsv(c.getProvinceIds()))
                .minReputation(c.getMinReputation())
                .maxReputation(c.getMaxReputation())
                .channels(splitCsv(c.getChannels()))
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .totalRecipients(c.getTotalRecipients())
                .totalDelivered(c.getTotalDelivered())
                .deliveryNote(c.getDeliveryNote())
                .createdBy(c.getCreatedBy())
                .createdAt(c.getCreatedAt())
                .sentAt(c.getSentAt())
                .build();
    }

    private static List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    private static String joinCsv(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return String.join(",", values.stream().filter(Objects::nonNull).map(String::trim).toList());
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
