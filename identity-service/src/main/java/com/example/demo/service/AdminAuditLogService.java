package com.example.demo.service;

import com.example.demo.dto.event.AdminAuditEvent;
import com.example.demo.dto.response.admin.AdminAuditLogResponse;
import com.example.demo.dto.response.admin.PageResult;
import com.example.demo.entity.AdminAuditLog;
import com.example.demo.entity.User;
import com.example.demo.repository.AdminAuditLogRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * ADM-FEAT-06: Ghi và tra cứu nhật ký kiểm toán hành động quản trị.
 * - Hành động trong identity-service: ghi trực tiếp qua {@link #record}.
 * - Hành động ở service khác: nhận qua Kafka topic admin-audit-events rồi lưu qua {@link #saveFromEvent}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminAuditLogService {

    public static final String SERVICE_NAME = "identity-service";

    AdminAuditLogRepository auditLogRepository;
    UserRepository userRepository;
    ObjectMapper objectMapper;

    /**
     * Ghi bản ghi kiểm toán trong transaction riêng: lỗi ghi log không làm hỏng nghiệp vụ chính.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String action, String targetType, String targetId,
                       String description, Object oldValue, Object newValue) {
        try {
            String actorId = currentActorId();
            AdminAuditLog logEntry = AdminAuditLog.builder()
                    .serviceName(SERVICE_NAME)
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .actorId(actorId)
                    .actorEmail(resolveEmail(actorId))
                    .description(description)
                    .oldValue(toJson(oldValue))
                    .newValue(toJson(newValue))
                    .build();
            auditLogRepository.save(logEntry);
        } catch (Exception e) {
            log.error("[AuditLog] Failed to record action={} targetId={}: {}", action, targetId, e.getMessage());
        }
    }

    /**
     * Lưu bản ghi nhận từ Kafka. Idempotent theo eventId (consumer có thể retry).
     */
    @Transactional
    public void saveFromEvent(AdminAuditEvent event) {
        if (event.getEventId() != null && auditLogRepository.existsByEventId(event.getEventId())) {
            log.info("[AuditLog] Duplicate audit event {} ignored", event.getEventId());
            return;
        }
        AdminAuditLog logEntry = AdminAuditLog.builder()
                .eventId(event.getEventId())
                .serviceName(event.getServiceName() != null ? event.getServiceName() : "unknown")
                .action(event.getAction() != null ? event.getAction() : "UNKNOWN")
                .targetType(event.getTargetType())
                .targetId(event.getTargetId())
                .actorId(event.getActorId())
                .actorEmail(resolveEmail(event.getActorId()))
                .description(event.getDescription())
                .oldValue(event.getOldValue())
                .newValue(event.getNewValue())
                .build();
        auditLogRepository.save(logEntry);
    }

    @Transactional(readOnly = true)
    public PageResult<AdminAuditLogResponse> search(String serviceName, String action, String keyword,
                                                    LocalDate fromDate, LocalDate toDate, int page, int size) {
        Specification<AdminAuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (serviceName != null && !serviceName.isBlank()) {
                predicates.add(cb.equal(root.get("serviceName"), serviceName.trim()));
            }
            if (action != null && !action.isBlank()) {
                predicates.add(cb.equal(root.get("action"), action.trim()));
            }
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("actorEmail"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("description"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("targetId"), "")), like)
                ));
            }
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate.atStartOfDay()));
            }
            if (toDate != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), toDate.plusDays(1).atStartOfDay()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<AdminAuditLog> result = auditLogRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));

        return PageResult.<AdminAuditLogResponse>builder()
                .items(result.getContent().stream().map(this::toResponse).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private AdminAuditLogResponse toResponse(AdminAuditLog entity) {
        return AdminAuditLogResponse.builder()
                .id(entity.getId())
                .serviceName(entity.getServiceName())
                .action(entity.getAction())
                .targetType(entity.getTargetType())
                .targetId(entity.getTargetId())
                .actorId(entity.getActorId())
                .actorEmail(entity.getActorEmail())
                .description(entity.getDescription())
                .oldValue(entity.getOldValue())
                .newValue(entity.getNewValue())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private String currentActorId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private String resolveEmail(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        return userRepository.findById(userId).map(User::getEmail).orElse(null);
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String str) {
            return str;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return String.valueOf(value);
        }
    }
}
