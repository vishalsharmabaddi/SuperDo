package com.superdo.ai.repository;

import com.superdo.ai.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    List<Loan> findByUserIdOrderByStartDateAsc(Long userId);

    @Query("""
            SELECT l FROM Loan l
            WHERE l.user.id = :userId
              AND (
                    LOWER(l.loanName) LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(l.lenderName) LIKE LOWER(CONCAT('%', :query, '%'))
                 OR UPPER(CONCAT('', l.loanType)) LIKE UPPER(CONCAT('%', :query, '%'))
              )
            ORDER BY l.startDate ASC
            """)
    List<Loan> searchByUserId(@Param("userId") Long userId, @Param("query") String query);
}
