package com.superdo.ai.controller;

import com.superdo.ai.dto.ExpenseRequest;
import com.superdo.ai.entity.Expense;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @GetMapping
    public List<Expense> list(@AuthenticationPrincipal UserPrincipal principal,
                              @RequestParam(required = false)
                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
                              @RequestParam(required = false)
                              @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return expenseService.list(principal.getId(), start, end);
    }

    @GetMapping("/summary")
    public Map<String, BigDecimal> summary(@AuthenticationPrincipal UserPrincipal principal,
                                           @RequestParam(required = false)
                                           @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
                                           @RequestParam(required = false)
                                           @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return expenseService.summary(principal.getId(), start, end);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Expense create(@AuthenticationPrincipal UserPrincipal principal,
                          @Valid @RequestBody ExpenseRequest request) {
        return expenseService.create(principal.getId(), request);
    }

    @PutMapping("/{id}")
    public Expense update(@AuthenticationPrincipal UserPrincipal principal,
                          @PathVariable Long id,
                          @Valid @RequestBody ExpenseRequest request) {
        return expenseService.update(principal.getId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal principal,
                       @PathVariable Long id) {
        expenseService.delete(principal.getId(), id);
    }
}
