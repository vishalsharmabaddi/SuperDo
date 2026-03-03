package com.superdo.ai.repository;

import com.superdo.ai.entity.LoanPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanPaymentRepository extends JpaRepository<LoanPayment, Long> {

    List<LoanPayment> findByUserIdAndLoanIdOrderByPaidDateDescCreatedAtDesc(Long userId, Long loanId);

    List<LoanPayment> findByUserIdOrderByPaidDateDescCreatedAtDesc(Long userId);

    void deleteByUserIdAndLoanId(Long userId, Long loanId);
}
