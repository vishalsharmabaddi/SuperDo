package com.superdo.ai.service;

import com.superdo.ai.dto.LoanPaymentRequest;
import com.superdo.ai.dto.LoanPaymentResponse;
import com.superdo.ai.dto.LoanRequest;
import com.superdo.ai.dto.LoanResponse;
import com.superdo.ai.dto.LoanSummaryResponse;
import com.superdo.ai.entity.Loan;
import com.superdo.ai.entity.LoanPayment;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.LoanPaymentRepository;
import com.superdo.ai.repository.LoanRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LoanService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final BigDecimal MONTHS_IN_YEAR = new BigDecimal("12");

    private final LoanRepository loanRepository;
    private final LoanPaymentRepository loanPaymentRepository;
    private final UserService userService;

    public LoanService(LoanRepository loanRepository,
                       LoanPaymentRepository loanPaymentRepository,
                       UserService userService) {
        this.loanRepository = loanRepository;
        this.loanPaymentRepository = loanPaymentRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<LoanResponse> list(Long userId) {
        List<Loan> loans = loanRepository.findByUserIdOrderByStartDateAsc(userId);
        List<LoanPayment> allPayments = loanPaymentRepository.findByUserIdOrderByPaidDateDescCreatedAtDesc(userId);
        Map<Long, List<LoanPayment>> byLoanId = groupPaymentsByLoanId(allPayments);

        return loans.stream()
                .map(loan -> toResponse(loan, byLoanId.getOrDefault(loan.getId(), List.of())))
                .sorted(Comparator.comparing(LoanResponse::getNextDueDate,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    @Transactional
    public LoanResponse create(Long userId, LoanRequest request) {
        Loan loan = new Loan();
        loan.setUser(userService.getRequiredUser(userId));
        applyRequest(loan, request);
        Loan saved = loanRepository.save(loan);
        return toResponse(saved, List.of());
    }

    @Transactional
    public LoanResponse update(Long userId, Long id, LoanRequest request) {
        Loan loan = getOwned(userId, id);
        applyRequest(loan, request);
        Loan saved = loanRepository.save(loan);
        List<LoanPayment> payments = loanPaymentRepository.findByUserIdAndLoanIdOrderByPaidDateDescCreatedAtDesc(userId, id);
        return toResponse(saved, payments);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Loan loan = getOwned(userId, id);
        // Ensure delete works even when payment history exists.
        loanPaymentRepository.deleteByUserIdAndLoanId(userId, id);
        loanRepository.delete(loan);
    }

    @Transactional
    public LoanPaymentResponse addPayment(Long userId, Long loanId, LoanPaymentRequest request) {
        Loan loan = getOwned(userId, loanId);
        BigDecimal emi = calculateEmi(loan);
        BigDecimal amount = request.getAmount() == null ? emi : money(request.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment amount must be positive");
        }

        LoanPayment payment = new LoanPayment();
        payment.setUser(loan.getUser());
        payment.setLoan(loan);
        payment.setPaidDate(request.getPaidDate() == null ? LocalDate.now() : request.getPaidDate());
        payment.setAmount(amount);
        payment.setExtraPayment(Boolean.TRUE.equals(request.getExtraPayment()) || amount.compareTo(emi) > 0);
        payment.setNote(trimToNull(request.getNote()));

        LoanPayment saved = loanPaymentRepository.save(payment);
        return toPaymentResponse(saved);
    }

    @Transactional(readOnly = true)
    public LoanSummaryResponse summary(Long userId) {
        List<LoanResponse> loans = list(userId);
        List<LoanResponse> activeLoans = loans.stream()
                .filter(x -> x.getTotalRemaining() != null && x.getTotalRemaining().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        LoanSummaryResponse response = new LoanSummaryResponse();
        response.setActiveLoanCount(activeLoans.size());
        response.setTotalMonthlyBurden(activeLoans.stream()
                .map(LoanResponse::getMonthlyEmi)
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP));
        response.setTotalOutstanding(activeLoans.stream()
                .map(LoanResponse::getTotalRemaining)
                .reduce(ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP));

        LoanResponse nextDue = activeLoans.stream()
                .filter(x -> x.getNextDueDate() != null)
                .min(Comparator.comparing(LoanResponse::getNextDueDate))
                .orElse(null);
        response.setNextUpcomingDueDate(nextDue == null ? null : nextDue.getNextDueDate());

        LoanResponse endsSoonest = activeLoans.stream()
                .filter(x -> x.getEstimatedClosingDate() != null)
                .min(Comparator.comparing(LoanResponse::getEstimatedClosingDate))
                .orElse(null);
        response.setEndsSoonestLoanName(endsSoonest == null ? null : endsSoonest.getLoanName());
        response.setEndsSoonestDate(endsSoonest == null ? null : endsSoonest.getEstimatedClosingDate());
        return response;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Loan getOwned(Long userId, Long id) {
        Loan loan = loanRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loan not found"));
        if (!loan.getUser().getId().equals(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Loan not found");
        }
        return loan;
    }

    private Map<Long, List<LoanPayment>> groupPaymentsByLoanId(List<LoanPayment> payments) {
        Map<Long, List<LoanPayment>> grouped = new LinkedHashMap<>();
        for (LoanPayment payment : payments) {
            Long loanId = payment.getLoan().getId();
            grouped.computeIfAbsent(loanId, k -> new ArrayList<>()).add(payment);
        }
        return grouped;
    }

    private void applyRequest(Loan loan, LoanRequest request) {
        loan.setLoanName(request.getLoanName().trim());
        loan.setLenderName(request.getLenderName().trim());
        loan.setLoanType(request.getLoanType());
        loan.setTotalLoanAmount(money(request.getTotalLoanAmount()));
        loan.setInterestRateAnnual(request.getInterestRateAnnual().setScale(4, RoundingMode.HALF_UP));
        loan.setTenureMonths(request.getTenureMonths());
        loan.setStartDate(request.getStartDate());
        loan.setEmiDueDay(request.getEmiDueDay());
    }

    private LoanResponse toResponse(Loan loan, List<LoanPayment> payments) {
        BigDecimal emi = calculateEmi(loan);
        BigDecimal totalPayable = money(emi.multiply(BigDecimal.valueOf(loan.getTenureMonths())));
        BigDecimal totalInterest = money(totalPayable.subtract(loan.getTotalLoanAmount()));

        BigDecimal totalPaid = payments.stream()
                .map(LoanPayment::getAmount)
                .reduce(ZERO, BigDecimal::add);
        totalPaid = money(totalPaid);
        BigDecimal totalRemaining = money(totalPayable.subtract(totalPaid).max(BigDecimal.ZERO));

        int emisPaid = emi.compareTo(BigDecimal.ZERO) == 0
                ? 0
                : Math.min(loan.getTenureMonths(), totalPaid.divide(emi, 0, RoundingMode.DOWN).intValue());
        int monthsRemaining = emi.compareTo(BigDecimal.ZERO) == 0 || totalRemaining.compareTo(BigDecimal.ZERO) <= 0
                ? 0
                : totalRemaining.divide(emi, 0, RoundingMode.UP).intValue();

        LoanProjection projection = projectWithPaymentHistory(loan, emi, payments);

        LoanResponse response = new LoanResponse();
        response.setId(loan.getId());
        response.setLoanName(loan.getLoanName());
        response.setLenderName(loan.getLenderName());
        response.setLoanType(loan.getLoanType());
        response.setTotalLoanAmount(loan.getTotalLoanAmount());
        response.setInterestRateAnnual(loan.getInterestRateAnnual());
        response.setTenureMonths(loan.getTenureMonths());
        response.setStartDate(loan.getStartDate());
        response.setEmiDueDay(loan.getEmiDueDay());
        response.setMonthlyEmi(emi);
        response.setTotalInterest(totalInterest);
        response.setTotalPayable(totalPayable);
        response.setEndDate(getDueDateForInstallment(loan, loan.getTenureMonths()));
        response.setTotalPaid(totalPaid);
        response.setTotalRemaining(totalRemaining);
        response.setEmisPaid(emisPaid);
        response.setMonthsRemaining(monthsRemaining);

        int estimatedInstallments = Math.min(loan.getTenureMonths(), Math.max(emisPaid, projection.monthsToClose));
        response.setEstimatedClosingDate(estimatedInstallments <= 0 ? loan.getStartDate() : getDueDateForInstallment(loan, estimatedInstallments));
        response.setMonthsSaved(Math.max(0, loan.getTenureMonths() - projection.monthsToClose));
        response.setInterestSaved(money(totalInterest.subtract(projection.projectedInterest).max(BigDecimal.ZERO)));

        if (totalRemaining.compareTo(BigDecimal.ZERO) > 0) {
            int nextInstallment = Math.min(loan.getTenureMonths(), emisPaid + 1);
            LocalDate nextDueDate = getDueDateForInstallment(loan, nextInstallment);
            response.setNextDueDate(nextDueDate);
            response.setNextDueBadge(resolveDueBadge(nextDueDate));
            response.setCurrentEmiDueAmount(emi.min(totalRemaining));
        } else {
            response.setNextDueBadge("PAID");
            response.setCurrentEmiDueAmount(ZERO);
        }

        List<LoanPaymentResponse> paymentResponses = payments.stream()
                .sorted(Comparator.comparing(LoanPayment::getPaidDate).reversed()
                        .thenComparing(LoanPayment::getCreatedAt, Comparator.reverseOrder()))
                .map(this::toPaymentResponse)
                .toList();
        response.setPayments(paymentResponses);
        response.setLastPayment(paymentResponses.isEmpty() ? null : paymentResponses.get(0));
        return response;
    }

    private LoanPaymentResponse toPaymentResponse(LoanPayment payment) {
        LoanPaymentResponse response = new LoanPaymentResponse();
        response.setId(payment.getId());
        response.setPaidDate(payment.getPaidDate());
        response.setAmount(money(payment.getAmount()));
        response.setExtraPayment(payment.isExtraPayment());
        response.setNote(payment.getNote());
        response.setCreatedAt(payment.getCreatedAt());
        return response;
    }

    private BigDecimal calculateEmi(Loan loan) {
        BigDecimal principal = loan.getTotalLoanAmount();
        int tenure = loan.getTenureMonths();
        if (tenure <= 0) return ZERO;

        BigDecimal monthlyRate = loan.getInterestRateAnnual()
                .divide(ONE_HUNDRED, 10, RoundingMode.HALF_UP)
                .divide(MONTHS_IN_YEAR, 10, RoundingMode.HALF_UP);

        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            return money(principal.divide(BigDecimal.valueOf(tenure), 2, RoundingMode.HALF_UP));
        }

        double p = principal.doubleValue();
        double r = monthlyRate.doubleValue();
        double n = tenure;
        double numerator = p * r * Math.pow(1 + r, n);
        double denominator = Math.pow(1 + r, n) - 1;
        return money(BigDecimal.valueOf(numerator / denominator));
    }

    private LocalDate getDueDateForInstallment(Loan loan, int installmentNumber) {
        if (installmentNumber <= 0) return getFirstDueDate(loan);
        LocalDate firstDue = getFirstDueDate(loan);
        LocalDate shifted = firstDue.plusMonths(installmentNumber - 1L);
        int dueDay = Math.min(loan.getEmiDueDay(), shifted.lengthOfMonth());
        return shifted.withDayOfMonth(dueDay);
    }

    private LocalDate getFirstDueDate(Loan loan) {
        LocalDate startDate = loan.getStartDate();
        int dueDay = loan.getEmiDueDay();
        int thisMonthDueDay = Math.min(dueDay, startDate.lengthOfMonth());
        LocalDate thisMonthDue = startDate.withDayOfMonth(thisMonthDueDay);
        if (!startDate.isAfter(thisMonthDue)) {
            return thisMonthDue;
        }
        LocalDate nextMonth = startDate.plusMonths(1);
        int nextDueDay = Math.min(dueDay, nextMonth.lengthOfMonth());
        return nextMonth.withDayOfMonth(nextDueDay);
    }

    private String resolveDueBadge(LocalDate dueDate) {
        if (dueDate == null) return "PAID";
        long days = ChronoUnit.DAYS.between(LocalDate.now(), dueDate);
        if (days < 0) return "OVERDUE";
        if (days == 0) return "DUE_TODAY";
        if (days <= 3) return "DUE_IN_" + days + "_DAYS";
        return "UPCOMING";
    }

    private LoanProjection projectWithPaymentHistory(Loan loan, BigDecimal emi, List<LoanPayment> payments) {
        double principal = loan.getTotalLoanAmount().doubleValue();
        int tenure = loan.getTenureMonths();
        double monthlyRate = loan.getInterestRateAnnual().doubleValue() / 1200d;

        double baselineInterest = 0d;
        double baselinePrincipal = principal;
        for (int i = 0; i < tenure && baselinePrincipal > 0; i++) {
            double interest = baselinePrincipal * monthlyRate;
            baselinePrincipal += interest;
            double pay = Math.min(emi.doubleValue(), baselinePrincipal);
            baselinePrincipal -= pay;
            baselineInterest += interest;
        }

        Map<Integer, BigDecimal> paymentsByInstallment = toInstallmentPaymentMap(loan, payments);
        int maxLoggedInstallment = paymentsByInstallment.keySet().stream().mapToInt(Integer::intValue).max().orElse(0);
        BigDecimal extraTotal = payments.stream()
                .map(p -> p.getAmount().subtract(emi).max(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgExtra = payments.isEmpty()
                ? BigDecimal.ZERO
                : extraTotal.divide(BigDecimal.valueOf(payments.size()), 2, RoundingMode.HALF_UP);

        double projectedPrincipal = principal;
        double projectedInterest = 0d;
        int month = 0;
        while (projectedPrincipal > 0.005d && month < 2000) {
            month++;
            double interest = projectedPrincipal * monthlyRate;
            projectedPrincipal += interest;

            BigDecimal scheduledPayment;
            if (month <= maxLoggedInstallment) {
                scheduledPayment = paymentsByInstallment.getOrDefault(month, BigDecimal.ZERO);
            } else {
                scheduledPayment = emi.add(avgExtra);
            }
            double paymentValue = Math.max(0d, scheduledPayment.doubleValue());
            paymentValue = Math.min(paymentValue, projectedPrincipal);
            projectedPrincipal -= paymentValue;
            projectedInterest += interest;
        }

        int monthsToClose = month == 0 ? tenure : month;
        return new LoanProjection(monthsToClose, money(BigDecimal.valueOf(projectedInterest)), money(BigDecimal.valueOf(baselineInterest)));
    }

    private Map<Integer, BigDecimal> toInstallmentPaymentMap(Loan loan, List<LoanPayment> payments) {
        Map<Integer, BigDecimal> result = new HashMap<>();
        YearMonth firstDueMonth = YearMonth.from(getFirstDueDate(loan));
        for (LoanPayment payment : payments) {
            int installment = (int) ChronoUnit.MONTHS.between(firstDueMonth, YearMonth.from(payment.getPaidDate())) + 1;
            if (installment <= 0) continue;
            result.merge(installment, payment.getAmount(), BigDecimal::add);
        }
        return result;
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private String trimToNull(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record LoanProjection(int monthsToClose, BigDecimal projectedInterest, BigDecimal baselineInterest) {
    }
}
