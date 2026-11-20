package com.example.demo.service;

import com.example.demo.dto.request.admin.BroadcastAudienceRequest;
import com.example.demo.dto.response.admin.BroadcastAudienceResponse;
import com.example.demo.dto.response.admin.DebtTransactionResponse;
import com.example.demo.dto.response.admin.DriverDebtResponse;
import com.example.demo.dto.response.admin.FinanceSummaryResponse;
import com.example.demo.dto.response.driver.CommissionConfigResponse;
import com.example.demo.entity.DebtTransaction;
import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.enums.DebtTransactionType;
import com.example.demo.enums.DriverStatus;
import com.example.demo.enums.Role;
import com.example.demo.repository.DebtTransactionRepository;
import com.example.demo.repository.DriverProfileRepository;
import com.example.demo.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * ADM-FEAT-02 (phần công nợ & hoa hồng) và ADM-FEAT-04 (lọc người nhận phát sóng).
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminFinanceService {

    private static final BigDecimal WARNING_RATIO = new BigDecimal("0.8");

    DriverProfileRepository driverProfileRepository;
    DebtTransactionRepository debtTransactionRepository;
    UserRepository userRepository;
    CommissionService commissionService;

    @Transactional(readOnly = true)
    public FinanceSummaryResponse getFinanceSummary(LocalDate fromDate, LocalDate toDate, String paymentMethod) {
        LocalDateTime from = (fromDate != null ? fromDate : LocalDate.now().withDayOfMonth(1)).atStartOfDay();
        LocalDateTime to = (toDate != null ? toDate : LocalDate.now()).plusDays(1).atStartOfDay();
        String method = paymentMethod == null ? "ALL" : paymentMethod.trim().toUpperCase(Locale.ROOT);

        BigDecimal cashCommission = "STRIPE".equals(method) ? BigDecimal.ZERO
                : debtTransactionRepository.sumCommission(EnumSet.of(DebtTransactionType.CASH_COMMISSION), from, to);
        BigDecimal stripeCommission = "CASH".equals(method) ? BigDecimal.ZERO
                : debtTransactionRepository.sumCommission(EnumSet.of(DebtTransactionType.STRIPE_COMMISSION), from, to);

        BigDecimal creditLimit = resolveCreditLimit();

        return FinanceSummaryResponse.builder()
                .cashCommission(cashCommission)
                .stripeCommission(stripeCommission)
                .commissionRevenue(cashCommission.add(stripeCommission))
                .outstandingDebt(driverProfileRepository.sumOutstandingDebt())
                .stripeOffsetRecovered(debtTransactionRepository.sumDebtReduced(DebtTransactionType.STRIPE_OFFSET, from, to))
                .manualDebtPaid(debtTransactionRepository.sumDebtReduced(DebtTransactionType.MANUAL_PAYMENT, from, to))
                .driversWithDebt(driverProfileRepository.countDriversWithDebt())
                .driversOverLimit(driverProfileRepository.countDriversOverLimit(creditLimit))
                .creditLimit(creditLimit)
                .build();
    }

    /**
     * Sổ công nợ tài xế. status: ALL | NORMAL | WARNING | BLOCKED
     */
    @Transactional(readOnly = true)
    public List<DriverDebtResponse> getDriverDebts(String keyword, String status) {
        BigDecimal creditLimit = resolveCreditLimit();
        String kw = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        String statusFilter = status == null || status.isBlank() ? "ALL" : status.trim().toUpperCase(Locale.ROOT);

        return driverProfileRepository.findForDebtLedger(DriverStatus.APPROVED).stream()
                .map(profile -> toDebtResponse(profile, creditLimit))
                .filter(row -> "ALL".equals(statusFilter) || statusFilter.equals(row.getDebtStatus()))
                .filter(row -> kw.isEmpty() || matches(row, kw))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DebtTransactionResponse> getDriverDebtTransactions(String driverUserId) {
        return debtTransactionRepository.findTop100ByDriverUserIdOrderByCreatedAtDesc(driverUserId).stream()
                .map(this::toTransactionResponse)
                .toList();
    }

    /**
     * ADM-FEAT-04: Lọc danh sách userId nhận thông báo theo vai trò / tỉnh hoạt động / điểm uy tín.
     */
    @Transactional(readOnly = true)
    public BroadcastAudienceResponse resolveAudience(BroadcastAudienceRequest request, boolean includeUserIds) {
        String role = request.getTargetRole() == null ? "ALL" : request.getTargetRole().trim().toUpperCase(Locale.ROOT);
        List<String> userIds;

        switch (role) {
            case "DRIVER" -> {
                Set<String> provinceFilter = request.getProvinceIds() == null
                        ? Set.of() : new HashSet<>(request.getProvinceIds());
                int minRep = request.getMinReputation() != null ? request.getMinReputation() : 0;
                int maxRep = request.getMaxReputation() != null ? request.getMaxReputation() : 100;

                userIds = driverProfileRepository.findAllByStatus(DriverStatus.APPROVED).stream()
                        .filter(p -> p.getUser() != null)
                        .filter(p -> {
                            int rep = p.getReputationScore() != null ? p.getReputationScore() : 80;
                            return rep >= minRep && rep <= maxRep;
                        })
                        .filter(p -> provinceFilter.isEmpty()
                                || (p.getOperatingProvinceIds() != null
                                && p.getOperatingProvinceIds().stream().anyMatch(provinceFilter::contains)))
                        .map(p -> p.getUser().getId())
                        .distinct()
                        .toList();
            }
            case "CUSTOMER" -> userIds = userRepository.findIdsByRole(Role.CUSTOMER);
            default -> userIds = userRepository.findAllIds();
        }

        return BroadcastAudienceResponse.builder()
                .totalRecipients(userIds.size())
                .userIds(includeUserIds ? userIds : null)
                .build();
    }

    // ===================== Helpers =====================

    private BigDecimal resolveCreditLimit() {
        CommissionConfigResponse config = commissionService.getCommissionConfig();
        return config.getCreditLimit() != null ? config.getCreditLimit() : CommissionService.DEFAULT_CREDIT_LIMIT;
    }

    private DriverDebtResponse toDebtResponse(DriverProfile profile, BigDecimal creditLimit) {
        User user = profile.getUser();
        BigDecimal debt = profile.getSystemDebt() != null ? profile.getSystemDebt() : BigDecimal.ZERO;

        String debtStatus = "NORMAL";
        if (creditLimit.signum() > 0) {
            if (debt.compareTo(creditLimit) >= 0) {
                debtStatus = "BLOCKED";
            } else if (debt.compareTo(creditLimit.multiply(WARNING_RATIO).setScale(2, RoundingMode.HALF_UP)) >= 0) {
                debtStatus = "WARNING";
            }
        }

        return DriverDebtResponse.builder()
                .driverProfileId(profile.getId())
                .userId(user != null ? user.getId() : null)
                .fullName(user != null ? user.getFullName() : null)
                .email(user != null ? user.getEmail() : null)
                .phoneNumber(user != null ? user.getPhoneNumber() : null)
                .plateNumber(profile.getVehicle() != null ? profile.getVehicle().getPlateNumber() : null)
                .operatingProvinceIds(profile.getOperatingProvinceIds())
                .systemDebt(debt)
                .creditLimit(creditLimit)
                .reputationScore(profile.getReputationScore())
                .driverRating(profile.getDriverRating())
                .debtStatus(debtStatus)
                .build();
    }

    private boolean matches(DriverDebtResponse row, String kw) {
        return contains(row.getFullName(), kw) || contains(row.getEmail(), kw)
                || contains(row.getPhoneNumber(), kw) || contains(row.getPlateNumber(), kw);
    }

    private boolean contains(String value, String kw) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(kw);
    }

    private DebtTransactionResponse toTransactionResponse(DebtTransaction tx) {
        return DebtTransactionResponse.builder()
                .id(tx.getId())
                .bookingId(tx.getBookingId())
                .type(tx.getType().name())
                .paymentMethod(tx.getPaymentMethod())
                .grossAmount(tx.getGrossAmount())
                .commissionRate(tx.getCommissionRate())
                .commissionAmount(tx.getCommissionAmount())
                .debtChange(tx.getDebtChange())
                .debtBefore(tx.getDebtBefore())
                .debtAfter(tx.getDebtAfter())
                .note(tx.getNote())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
