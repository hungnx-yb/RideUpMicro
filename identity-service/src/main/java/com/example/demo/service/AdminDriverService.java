package com.example.demo.service;

import com.example.demo.dto.response.admin.PageResult;
import com.example.demo.dto.response.driver.CommissionConfigResponse;
import com.example.demo.dto.response.user.DriverResponse;
import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.entity.Vehicle;
import com.example.demo.enums.DriverStatus;
import com.example.demo.repository.DriverProfileRepository;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Quản lý tài xế cho Web Admin: tìm kiếm + lọc + phân trang toàn bộ hồ sơ tài xế.
 * Hồ sơ nháp (mới chụp mặt eKYC, chưa gửi đủ thông tin, cccd = null) không được liệt kê.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminDriverService {

    // Giá trị mặc định của DriverProfile khi cột còn null
    static final int DEFAULT_REPUTATION_SCORE = 80;
    static final int MAX_PAGE_SIZE = 100;

    DriverProfileRepository driverProfileRepository;
    DriverService driverService;
    CommissionService commissionService;

    /**
     * @param status        ALL | PENDING | APPROVED | REJECTED
     * @param vehicleStatus ALL | VERIFIED | PENDING | REJECTED | NONE
     * @param lockStatus    ALL | LOCKED (nợ >= hạn mức hoặc uy tín < ngưỡng) | ACTIVE
     * @param sort          NEWEST | OLDEST | RATING_DESC | REPUTATION_ASC | DEBT_DESC | RIDES_DESC
     */
    public PageResult<DriverResponse> searchDrivers(String keyword, String status, String vehicleStatus,
                                                    String lockStatus, String sort, int page, int size) {
        // Đọc ngưỡng khóa trước (có thể khởi tạo cấu hình mặc định lần đầu)
        CommissionConfigResponse config = commissionService.getCommissionConfig();
        BigDecimal creditLimit = config.getCreditLimit() != null
                ? config.getCreditLimit() : CommissionService.DEFAULT_CREDIT_LIMIT;
        int minAcceptScore = config.getMinAcceptScore() != null
                ? config.getMinAcceptScore() : CommissionService.DEFAULT_MIN_ACCEPT_SCORE;

        Specification<DriverProfile> spec = buildSpec(keyword, status, vehicleStatus, lockStatus,
                creditLimit, minAcceptScore);

        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<DriverProfile> result = driverProfileRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), safeSize, toSort(sort)));

        List<DriverResponse> items = result.getContent().stream()
                .map(profile -> {
                    DriverResponse response = driverService.mapToDriverResponse(profile);
                    response.setIsLocked(isLocked(profile, creditLimit, minAcceptScore));
                    return response;
                })
                .toList();

        return PageResult.<DriverResponse>builder()
                .items(items)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    // package-private + static: không dùng field nào, tách riêng để kiểm thử được
    static Specification<DriverProfile> buildSpec(String keyword, String status, String vehicleStatus,
                                                  String lockStatus, BigDecimal creditLimit, int minAcceptScore) {
        return (root, query, cb) -> {
            // Truy vấn đếm (count) không được fetch; truy vấn lấy dữ liệu thì fetch luôn user + vehicle để tránh N+1
            boolean isCountQuery = query.getResultType() == Long.class || query.getResultType() == long.class;
            Join<DriverProfile, User> user;
            Join<DriverProfile, Vehicle> vehicle;
            if (isCountQuery) {
                user = root.join("user", JoinType.INNER);
                vehicle = root.join("vehicle", JoinType.LEFT);
            } else {
                // Hibernate trả về đối tượng vừa là Fetch vừa là Join => dùng luôn làm Join cho điều kiện lọc
                user = (Join<DriverProfile, User>) root.<DriverProfile, User>fetch("user", JoinType.INNER);
                vehicle = (Join<DriverProfile, Vehicle>) root.<DriverProfile, Vehicle>fetch("vehicle", JoinType.LEFT);
            }

            List<Predicate> predicates = new ArrayList<>();

            // Chỉ hồ sơ đã gửi đầy đủ (bỏ hồ sơ nháp)
            predicates.add(cb.isNotNull(root.get("cccd")));

            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(user.get("fullName"), "")), like),
                        cb.like(cb.lower(cb.coalesce(user.get("email"), "")), like),
                        cb.like(cb.lower(cb.coalesce(user.get("phoneNumber"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("cccd"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("gplx"), "")), like),
                        cb.like(cb.lower(cb.coalesce(vehicle.get("plateNumber"), "")), like)
                ));
            }

            DriverStatus driverStatus = parseDriverStatus(status);
            if (driverStatus != null) {
                predicates.add(cb.equal(root.get("status"), driverStatus));
            }

            switch (normalize(vehicleStatus)) {
                case "VERIFIED" -> predicates.add(cb.isTrue(vehicle.get("isVerified")));
                case "PENDING" -> predicates.add(cb.and(
                        cb.isNotNull(vehicle.get("id")),
                        cb.isFalse(cb.coalesce(vehicle.<Boolean>get("isVerified"), Boolean.FALSE)),
                        cb.isNull(vehicle.get("rejectedAt"))));
                case "REJECTED" -> predicates.add(cb.and(
                        cb.isNotNull(vehicle.get("id")),
                        cb.isFalse(cb.coalesce(vehicle.<Boolean>get("isVerified"), Boolean.FALSE)),
                        cb.isNotNull(vehicle.get("rejectedAt"))));
                case "NONE" -> predicates.add(cb.isNull(vehicle.get("id")));
                default -> { /* ALL */ }
            }

            // Cùng quy tắc với CommissionService.getDriverEligibility: nợ >= hạn mức hoặc uy tín < ngưỡng => khóa
            Expression<BigDecimal> debt = cb.coalesce(root.<BigDecimal>get("systemDebt"), BigDecimal.ZERO);
            Expression<Integer> reputation = cb.coalesce(root.<Integer>get("reputationScore"), DEFAULT_REPUTATION_SCORE);
            Predicate locked = cb.or(
                    cb.greaterThanOrEqualTo(debt, creditLimit),
                    cb.lessThan(reputation, minAcceptScore));
            switch (normalize(lockStatus)) {
                case "LOCKED" -> predicates.add(locked);
                case "ACTIVE" -> predicates.add(cb.not(locked));
                default -> { /* ALL */ }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static boolean isLocked(DriverProfile profile, BigDecimal creditLimit, int minAcceptScore) {
        BigDecimal debt = profile.getSystemDebt() != null ? profile.getSystemDebt() : BigDecimal.ZERO;
        int reputation = profile.getReputationScore() != null ? profile.getReputationScore() : DEFAULT_REPUTATION_SCORE;
        return debt.compareTo(creditLimit) >= 0 || reputation < minAcceptScore;
    }

    static Sort toSort(String sort) {
        Sort primary = switch (normalize(sort)) {
            case "OLDEST" -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "RATING_DESC" -> Sort.by(Sort.Direction.DESC, "driverRating");
            case "REPUTATION_ASC" -> Sort.by(Sort.Direction.ASC, "reputationScore");
            case "DEBT_DESC" -> Sort.by(Sort.Direction.DESC, "systemDebt");
            case "RIDES_DESC" -> Sort.by(Sort.Direction.DESC, "totalDriverRides");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
        // Khóa phụ theo id để phân trang ổn định khi giá trị sắp xếp trùng nhau
        return primary.and(Sort.by(Sort.Direction.ASC, "id"));
    }

    private static DriverStatus parseDriverStatus(String status) {
        String value = normalize(status);
        if (value.isEmpty() || "ALL".equals(value)) {
            return null;
        }
        try {
            return DriverStatus.valueOf(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }
}
