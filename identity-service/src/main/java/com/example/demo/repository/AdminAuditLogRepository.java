package com.example.demo.repository;

import com.example.demo.entity.AdminAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, String>,
        JpaSpecificationExecutor<AdminAuditLog> {
    boolean existsByEventId(String eventId);
}
