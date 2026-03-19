package com.example.demo.repository;

import com.example.demo.dto.response.user.DriverDetailProjection;
import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.enums.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverProfileRepository extends JpaRepository<DriverProfile, String> {
    Optional<DriverProfile> findByUser(User user);
    Optional<DriverProfile> findByUserId(String userId);
    boolean existsByUser(User user);
    boolean existsByCccd(String cccd);
    boolean existsByGplx(String gplx);
    long countByStatus(DriverStatus status);
    List<DriverProfile> findAllByStatus(DriverStatus status);

    @Query(value = """
    SELECT 
        v.id AS vehicleId,
        v.vehicle_image AS vehicleImage,
        v.vehicle_brand AS vehicleBrand,
        v.vehicle_model AS vehicleModel,

        u.id AS driverId,
        u.full_name AS driverName,
        u.email AS driverEmail,
        u.phone_number AS driverPhone,
        u.avatar_url AS avatarUrl

    FROM user u
    JOIN driver_profile d ON u.id = d.user_id
    JOIN vehicle v ON d.id = v.driver_id

    WHERE u.id IN (:driverIds)
    """, nativeQuery = true)
    List<DriverDetailProjection> getDriverDetailList(
            @Param("driverIds") List<String> driverIds
    );
}
