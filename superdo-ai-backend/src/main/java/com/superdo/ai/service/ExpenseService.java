package com.superdo.ai.service;

import com.superdo.ai.dto.ExpenseRequest;
import com.superdo.ai.entity.Expense;
import com.superdo.ai.entity.ExpenseType;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.ExpenseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExpenseService {

    private static final Logger log = LoggerFactory.getLogger(ExpenseService.class);

    private final ExpenseRepository expenseRepository;
    private final UserService userService;

    public ExpenseService(ExpenseRepository expenseRepository, UserService userService) {
        this.expenseRepository = expenseRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<Expense> list(Long userId, LocalDate start, LocalDate end) {
        if (start != null || end != null) {
            return expenseRepository.findByUserIdWithOptionalDateRangeOrderByTxnDateDesc(userId, start, end);
        }
        return expenseRepository.findByUserIdOrderByTxnDateDesc(userId);
    }

    @Transactional
    public Expense create(Long userId, ExpenseRequest request) {
        Expense expense = new Expense();
        expense.setUser(userService.getRequiredUser(userId));
        applyRequest(expense, request);
        Expense saved = expenseRepository.save(expense);
        log.debug("Expense created id={} for userId={}", saved.getId(), userId);
        return saved;
    }

    @Transactional
    public Expense update(Long userId, Long id, ExpenseRequest request) {
        Expense expense = getOwned(userId, id);
        applyRequest(expense, request);
        Expense saved = expenseRepository.save(expense);
        log.debug("Expense updated id={} for userId={}", id, userId);
        return saved;
    }

    @Transactional
    public void delete(Long userId, Long id) {
        expenseRepository.delete(getOwned(userId, id));
        log.debug("Expense deleted id={} for userId={}", id, userId);
    }

    /**
     * Calculates income, expense, and savings totals using DB-level aggregation
     * instead of fetching all rows into memory.
     */
    @Transactional(readOnly = true)
    public Map<String, BigDecimal> summary(Long userId, LocalDate start, LocalDate end) {
        BigDecimal income  = expenseRepository.sumByUserIdAndType(userId, ExpenseType.INCOME,  start, end);
        BigDecimal expense = expenseRepository.sumByUserIdAndType(userId, ExpenseType.EXPENSE, start, end);

        Map<String, BigDecimal> result = new LinkedHashMap<>();
        result.put("income",  income);
        result.put("expense", expense);
        result.put("savings", income.subtract(expense));
        return result;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Expense getOwned(Long userId, Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Expense not found"));
        if (!expense.getUser().getId().equals(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Expense not found");
        }
        return expense;
    }

    private void applyRequest(Expense expense, ExpenseRequest request) {
        expense.setType(request.getType());
        expense.setCategory(request.getCategory().trim());
        expense.setAmount(request.getAmount());
        expense.setTxnDate(request.getTxnDate());
        expense.setNote(request.getNote());
    }
}
