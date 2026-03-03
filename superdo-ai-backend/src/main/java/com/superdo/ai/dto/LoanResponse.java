package com.superdo.ai.dto;

import com.superdo.ai.entity.LoanType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class LoanResponse {

    private Long id;
    private String loanName;
    private String lenderName;
    private LoanType loanType;
    private BigDecimal totalLoanAmount;
    private BigDecimal interestRateAnnual;
    private Integer tenureMonths;
    private LocalDate startDate;
    private Integer emiDueDay;

    private BigDecimal monthlyEmi;
    private BigDecimal totalInterest;
    private BigDecimal totalPayable;
    private LocalDate endDate;

    private BigDecimal totalPaid;
    private BigDecimal totalRemaining;
    private Integer emisPaid;
    private Integer monthsRemaining;
    private LocalDate estimatedClosingDate;
    private Integer monthsSaved;
    private BigDecimal interestSaved;

    private LocalDate nextDueDate;
    private String nextDueBadge;
    private BigDecimal currentEmiDueAmount;

    private LoanPaymentResponse lastPayment;
    private List<LoanPaymentResponse> payments = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getLoanName() { return loanName; }
    public void setLoanName(String loanName) { this.loanName = loanName; }
    public String getLenderName() { return lenderName; }
    public void setLenderName(String lenderName) { this.lenderName = lenderName; }
    public LoanType getLoanType() { return loanType; }
    public void setLoanType(LoanType loanType) { this.loanType = loanType; }
    public BigDecimal getTotalLoanAmount() { return totalLoanAmount; }
    public void setTotalLoanAmount(BigDecimal totalLoanAmount) { this.totalLoanAmount = totalLoanAmount; }
    public BigDecimal getInterestRateAnnual() { return interestRateAnnual; }
    public void setInterestRateAnnual(BigDecimal interestRateAnnual) { this.interestRateAnnual = interestRateAnnual; }
    public Integer getTenureMonths() { return tenureMonths; }
    public void setTenureMonths(Integer tenureMonths) { this.tenureMonths = tenureMonths; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public Integer getEmiDueDay() { return emiDueDay; }
    public void setEmiDueDay(Integer emiDueDay) { this.emiDueDay = emiDueDay; }
    public BigDecimal getMonthlyEmi() { return monthlyEmi; }
    public void setMonthlyEmi(BigDecimal monthlyEmi) { this.monthlyEmi = monthlyEmi; }
    public BigDecimal getTotalInterest() { return totalInterest; }
    public void setTotalInterest(BigDecimal totalInterest) { this.totalInterest = totalInterest; }
    public BigDecimal getTotalPayable() { return totalPayable; }
    public void setTotalPayable(BigDecimal totalPayable) { this.totalPayable = totalPayable; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public BigDecimal getTotalPaid() { return totalPaid; }
    public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }
    public BigDecimal getTotalRemaining() { return totalRemaining; }
    public void setTotalRemaining(BigDecimal totalRemaining) { this.totalRemaining = totalRemaining; }
    public Integer getEmisPaid() { return emisPaid; }
    public void setEmisPaid(Integer emisPaid) { this.emisPaid = emisPaid; }
    public Integer getMonthsRemaining() { return monthsRemaining; }
    public void setMonthsRemaining(Integer monthsRemaining) { this.monthsRemaining = monthsRemaining; }
    public LocalDate getEstimatedClosingDate() { return estimatedClosingDate; }
    public void setEstimatedClosingDate(LocalDate estimatedClosingDate) { this.estimatedClosingDate = estimatedClosingDate; }
    public Integer getMonthsSaved() { return monthsSaved; }
    public void setMonthsSaved(Integer monthsSaved) { this.monthsSaved = monthsSaved; }
    public BigDecimal getInterestSaved() { return interestSaved; }
    public void setInterestSaved(BigDecimal interestSaved) { this.interestSaved = interestSaved; }
    public LocalDate getNextDueDate() { return nextDueDate; }
    public void setNextDueDate(LocalDate nextDueDate) { this.nextDueDate = nextDueDate; }
    public String getNextDueBadge() { return nextDueBadge; }
    public void setNextDueBadge(String nextDueBadge) { this.nextDueBadge = nextDueBadge; }
    public BigDecimal getCurrentEmiDueAmount() { return currentEmiDueAmount; }
    public void setCurrentEmiDueAmount(BigDecimal currentEmiDueAmount) { this.currentEmiDueAmount = currentEmiDueAmount; }
    public LoanPaymentResponse getLastPayment() { return lastPayment; }
    public void setLastPayment(LoanPaymentResponse lastPayment) { this.lastPayment = lastPayment; }
    public List<LoanPaymentResponse> getPayments() { return payments; }
    public void setPayments(List<LoanPaymentResponse> payments) { this.payments = payments; }
}
