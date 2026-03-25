package com.example.demo.repository;

import com.example.demo.dto.response.user.DriverResponse;
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

    @Query("""
    SELECT new com.example.demo.dto.response.user.DriverResponse(
        u.id,
        u.fullName,
        u.email,
        u.phoneNumber,
        u.avatarUrl,
        d.driverRating,
        v.id,
        v.vehicleImage,
        v.vehicleBrand,
        v.vehicleModel
    )
    FROM User u
    JOIN DriverProfile d ON u.id = d.user.id
    JOIN Vehicle v ON d.id = v.driver.id
    WHERE u.id IN :driverIds
""")
    List<DriverResponse> getDriverDetailList(@Param("driverIds") List<String> driverIds);
}
