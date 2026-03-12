package com.example.demo.repository;

import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.enums.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {
    Optional<DriverProfile> findByUser(User user);
    Optional<DriverProfile> findByUserId(String userId);
    boolean existsByUser(User user);
    boolean existsByCccd(String cccd);
    boolean existsByGplx(String gplx);
    long countByStatus(DriverStatus status);
}
