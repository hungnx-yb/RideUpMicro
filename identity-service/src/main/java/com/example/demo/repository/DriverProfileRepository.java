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
    Optional<DriverProfile> findByStripeAccountId(String stripeAccountId);
    boolean existsByUser(User user);
    boolean existsByCccd(String cccd);
    boolean existsByGplx(String gplx);
    long countByStatus(DriverStatus status);
    List<DriverProfile> findAllByStatus(DriverStatus status);
    List<DriverProfile> findByStatusAndReputationScoreLessThan(DriverStatus status, Integer reputationScore);

    @Query(value = """
        SELECT * FROM driver_profile dp 
        WHERE JSON_CONTAINS(dp.operating_provinces, CONCAT('"', :startProvinceId, '"')) 
          AND JSON_CONTAINS(dp.operating_provinces, CONCAT('"', :endProvinceId, '"')) 
          AND dp.status = 'APPROVED'
        """, nativeQuery = true)
    List<DriverProfile> findApprovedByOperatingProvinces(@Param("startProvinceId") String startProvinceId, @Param("endProvinceId") String endProvinceId);

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
        v.vehicleModel,
        v.seatCapacity,
        v.isVerified,
        v.isActive
    )
    FROM User u
    JOIN DriverProfile d ON u.id = d.user.id
    JOIN Vehicle v ON d.id = v.driver.id
    WHERE u.id IN :driverIds
""")
    List<DriverResponse> getDriverDetailList(@Param("driverIds") List<String> driverIds);

    // ===== ADM-FEAT-02: Thống kê công nợ =====
    @Query("SELECT COALESCE(SUM(d.systemDebt), 0) FROM DriverProfile d")
    java.math.BigDecimal sumOutstandingDebt();

    @Query("SELECT COUNT(d) FROM DriverProfile d WHERE d.systemDebt > 0")
    long countDriversWithDebt();

    @Query("SELECT COUNT(d) FROM DriverProfile d WHERE d.systemDebt >= :creditLimit")
    long countDriversOverLimit(@Param("creditLimit") java.math.BigDecimal creditLimit);

    /** Danh sách tài xế cho sổ công nợ: đã duyệt hoặc đang có nợ (fetch sẵn user & xe tránh N+1) */
    @Query("""
            SELECT d FROM DriverProfile d
            LEFT JOIN FETCH d.user
            LEFT JOIN FETCH d.vehicle
            WHERE d.status = :status OR d.systemDebt > 0
            ORDER BY d.systemDebt DESC
            """)
    List<DriverProfile> findForDebtLedger(@Param("status") DriverStatus status);
}
