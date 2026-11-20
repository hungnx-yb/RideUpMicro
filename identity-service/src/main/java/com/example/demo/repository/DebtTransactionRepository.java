package com.example.demo.repository;

import com.example.demo.entity.DebtTransaction;
import com.example.demo.enums.DebtTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface DebtTransactionRepository extends JpaRepository<DebtTransaction, String> {

    List<DebtTransaction> findTop100ByDriverUserIdOrderByCreatedAtDesc(String driverUserId);

    boolean existsByBookingIdAndTypeIn(String bookingId, Collection<DebtTransactionType> types);

    @Query("""
            SELECT COALESCE(SUM(t.commissionAmount), 0) FROM DebtTransaction t
            WHERE t.type IN :types
              AND t.createdAt >= :from AND t.createdAt < :to
            """)
    BigDecimal sumCommission(@Param("types") Collection<DebtTransactionType> types,
                             @Param("from") LocalDateTime from,
                             @Param("to") LocalDateTime to);

    /** Tổng số nợ đã giảm (debtChange âm) theo loại giao dịch */
    @Query("""
            SELECT COALESCE(SUM(-t.debtChange), 0) FROM DebtTransaction t
            WHERE t.type = :type
              AND t.createdAt >= :from AND t.createdAt < :to
            """)
    BigDecimal sumDebtReduced(@Param("type") DebtTransactionType type,
                              @Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to);
}
