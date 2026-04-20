package com.rideup.notification_service.service;
import com.rideup.notification_service.constant.RedisKeyTTL;
import com.rideup.notification_service.constant.RedisPrefixKeyConstant;
import com.rideup.notification_service.dto.response.NotificationResponse;
import com.rideup.notification_service.entity.Notification;
import com.rideup.notification_service.enums.NotificationStatus;
import com.rideup.notification_service.enums.NotificationType;
import com.rideup.notification_service.exception.AppException;
import com.rideup.notification_service.exception.ErrorCode;
import com.rideup.notification_service.repository.NotificationRepository;
import com.rideup.notification_service.utils.SecurityUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationService {

    NotificationRepository notificationRepository;
    ModelMapper modelMapper;
    RedisTemplate<String, Object> redisTemplate;
    SimpMessagingTemplate messagingTemplate;


    @Transactional
    public NotificationResponse createNotification(String userId,
                                                   String title,
                                                   String message,
                                                   NotificationType type,
                                                   String metadata) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .status(NotificationStatus.UNREAD)
                .metadata(metadata)
                .build();

        Notification saved = notificationRepository.save(notification);
        String key = RedisPrefixKeyConstant.UNRED_NOTIFICATION + userId;
        if(redisTemplate.hasKey(key)){
            redisTemplate.opsForValue().increment(key);
        }
        NotificationResponse response = modelMapper.map(saved, NotificationResponse.class);
        if (userId != null && !userId.isBlank()) {
            messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", response);
        }
        return response;
    }


    @Transactional(readOnly = true)
    public Slice<NotificationResponse> getMyNotifications(Pageable pageable, String status) {
        String userId = SecurityUtils.getCurrentUserId();
        if (status == null || status.isBlank()) {
            return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                    .map(notification -> modelMapper.map(notification, NotificationResponse.class));
        }
        NotificationStatus resolvedStatus = NotificationStatus.valueOf(status.trim().toUpperCase());
        return notificationRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, resolvedStatus, pageable)
                .map(notification -> modelMapper.map(notification, NotificationResponse.class));
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        String userId = SecurityUtils.getCurrentUserId();
        String key = RedisPrefixKeyConstant.UNRED_NOTIFICATION + userId;
        if (redisTemplate.hasKey(key)) {
            Object value = redisTemplate.opsForValue().get(key);
            if (value instanceof Number count) {
                return count.longValue();
            }
        }
        long count= notificationRepository.countByUserIdAndStatus(userId, NotificationStatus.UNREAD);
        redisTemplate.opsForValue().set(key,count, RedisKeyTTL.UNRED_NOTIFICATION_TTL);
        return count;
    }


    @Transactional
    public NotificationResponse markRead(String notificationId) {
        String userId = SecurityUtils.getCurrentUserId();
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));

        boolean wasUnread = notification.getStatus() == NotificationStatus.UNREAD;
        if (wasUnread) {
            notification.setStatus(NotificationStatus.READ);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
            String key = RedisPrefixKeyConstant.UNRED_NOTIFICATION + userId;
            if (Boolean.TRUE.equals(redisTemplate.hasKey(key))) {
                Object value = redisTemplate.opsForValue().get(key);
                if (value instanceof Long count && count > 0) {
                    redisTemplate.opsForValue().decrement(key);
                }
            }
        }
        return modelMapper.map(notification, NotificationResponse.class);
    }


    @Transactional
    public int markAllRead() {
        String userId = SecurityUtils.getCurrentUserId();
        List<Notification> notifications = notificationRepository.findByUserIdAndStatus(userId, NotificationStatus.UNREAD);
        if (notifications.isEmpty()) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now();
        for (Notification notification : notifications) {
            notification.setStatus(NotificationStatus.READ);
            notification.setReadAt(now);
        }
        notificationRepository.saveAll(notifications);
        String key = RedisPrefixKeyConstant.UNRED_NOTIFICATION + userId;
        Boolean exists = redisTemplate.hasKey(key);
        if (Boolean.TRUE.equals(exists)) {
            redisTemplate.opsForValue().set(key, 0L, RedisKeyTTL.UNRED_NOTIFICATION_TTL);
        }
        return notifications.size();
    }


}
