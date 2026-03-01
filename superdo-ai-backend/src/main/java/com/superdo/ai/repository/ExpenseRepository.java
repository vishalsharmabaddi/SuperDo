package com.superdo.ai.repository;

import com.superdo.ai.entity.Expense;
import com.superdo.ai.entity.ExpenseType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUserIdOrderByTxnDateDesc(Long userId);

    List<Expense> findByUserIdAndTxnDateBetweenOrderByTxnDateDesc(
            Long userId, LocalDate start, LocalDate end);

    @Query("""
            SELECT e FROM Expense e
            WHERE e.user.id = :userId
              AND (:start IS NULL OR e.txnDate >= :start)
              AND (:end   IS NULL OR e.txnDate <= :end)
            ORDER BY e.txnDate DESC
            """)
    List<Expense> findByUserIdWithOptionalDateRangeOrderByTxnDateDesc(
            @Param("userId") Long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    long countByUserId(Long userId);

    /**
     * Calculates the total for a given expense type (INCOME or EXPENSE)
     * within an optional date range – all in one SQL aggregate instead of
     * fetching all rows into Java memory.
     */
    @Query("""
            SELECT COALESCE(SUM(e.amount), 0)
            FROM Expense e
            WHERE e.user.id = :userId
              AND e.type = :type
              AND (:start IS NULL OR e.txnDate >= :start)
              AND (:end   IS NULL OR e.txnDate <= :end)
            """)
    BigDecimal sumByUserIdAndType(@Param("userId") Long userId,
                                  @Param("type")   ExpenseType type,
                                  @Param("start")  LocalDate start,
                                  @Param("end")    LocalDate end);

    /**
     * Search expenses by category or note text.
     */
    @Query("""
            SELECT e FROM Expense e
            WHERE e.user.id = :userId
              AND (
                    LOWER(e.category) LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(e.note)     LIKE LOWER(CONCAT('%', :query, '%'))
              )
            ORDER BY e.txnDate DESC
            """)
    List<Expense> searchByUserId(@Param("userId") Long userId, @Param("query") String query);
}
