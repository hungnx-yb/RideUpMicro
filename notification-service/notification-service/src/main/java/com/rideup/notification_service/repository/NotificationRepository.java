package com.rideup.notification_service.repository;

import com.rideup.notification_service.entity.Notification;
import com.rideup.notification_service.enums.NotificationStatus;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    Slice<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    Slice<Notification> findByUserIdAndStatusOrderByCreatedAtDesc(String userId, NotificationStatus status, Pageable pageable);
    long countByUserIdAndStatus(String userId, NotificationStatus status);
    Optional<Notification> findByIdAndUserId(String id, String userId);
    List<Notification> findByUserIdAndStatus(String userId, NotificationStatus status);
}
