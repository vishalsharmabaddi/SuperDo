package com.superdo.ai.dto;

import com.superdo.ai.entity.LoanType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class LoanRequest {

    @NotNull(message = "Loan name is required")
    @Size(min = 2, max = 255, message = "Loan name must be between 2 and 255 characters")
    private String loanName;

    @NotNull(message = "Lender name is required")
    @Size(min = 2, max = 255, message = "Lender name must be between 2 and 255 characters")
    private String lenderName;

    @NotNull(message = "Loan type is required")
    private LoanType loanType;

    @NotNull(message = "Total loan amount is required")
    @DecimalMin(value = "0.01", message = "Total loan amount must be positive")
    @Digits(integer = 10, fraction = 2, message = "Total loan amount must have at most 10 integer digits and 2 decimals")
    private BigDecimal totalLoanAmount;

    @NotNull(message = "Interest rate is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Interest rate cannot be negative")
    @Digits(integer = 3, fraction = 4, message = "Interest rate format is invalid")
    private BigDecimal interestRateAnnual;

    @NotNull(message = "Tenure is required")
    @Min(value = 1, message = "Tenure must be at least 1 month")
    @Max(value = 1200, message = "Tenure is too large")
    private Integer tenureMonths;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "EMI due day is required")
    @Min(value = 1, message = "EMI due day must be between 1 and 28")
    @Max(value = 28, message = "EMI due day must be between 1 and 28")
    private Integer emiDueDay;

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
}
