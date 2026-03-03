package com.superdo.ai.controller;

import com.superdo.ai.dto.LoanPaymentRequest;
import com.superdo.ai.dto.LoanPaymentResponse;
import com.superdo.ai.dto.LoanRequest;
import com.superdo.ai.dto.LoanResponse;
import com.superdo.ai.dto.LoanSummaryResponse;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.LoanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService loanService;

    public LoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    @GetMapping
    public List<LoanResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return loanService.list(principal.getId());
    }

    @GetMapping("/summary")
    public LoanSummaryResponse summary(@AuthenticationPrincipal UserPrincipal principal) {
        return loanService.summary(principal.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse create(@AuthenticationPrincipal UserPrincipal principal,
                               @Valid @RequestBody LoanRequest request) {
        return loanService.create(principal.getId(), request);
    }

    @PutMapping("/{id}")
    public LoanResponse update(@AuthenticationPrincipal UserPrincipal principal,
                               @PathVariable Long id,
                               @Valid @RequestBody LoanRequest request) {
        return loanService.update(principal.getId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        loanService.delete(principal.getId(), id);
    }

    @PostMapping("/{id}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public LoanPaymentResponse addPayment(@AuthenticationPrincipal UserPrincipal principal,
                                          @PathVariable Long id,
                                          @Valid @RequestBody LoanPaymentRequest request) {
        return loanService.addPayment(principal.getId(), id, request);
    }
}
