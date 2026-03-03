package com.superdo.ai.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class LoanSummaryResponse {

    private BigDecimal totalMonthlyBurden;
    private BigDecimal totalOutstanding;
    private LocalDate nextUpcomingDueDate;
    private String endsSoonestLoanName;
    private LocalDate endsSoonestDate;
    private Integer activeLoanCount;

    public BigDecimal getTotalMonthlyBurden() { return totalMonthlyBurden; }
    public void setTotalMonthlyBurden(BigDecimal totalMonthlyBurden) { this.totalMonthlyBurden = totalMonthlyBurden; }
    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }
    public LocalDate getNextUpcomingDueDate() { return nextUpcomingDueDate; }
    public void setNextUpcomingDueDate(LocalDate nextUpcomingDueDate) { this.nextUpcomingDueDate = nextUpcomingDueDate; }
    public String getEndsSoonestLoanName() { return endsSoonestLoanName; }
    public void setEndsSoonestLoanName(String endsSoonestLoanName) { this.endsSoonestLoanName = endsSoonestLoanName; }
    public LocalDate getEndsSoonestDate() { return endsSoonestDate; }
    public void setEndsSoonestDate(LocalDate endsSoonestDate) { this.endsSoonestDate = endsSoonestDate; }
    public Integer getActiveLoanCount() { return activeLoanCount; }
    public void setActiveLoanCount(Integer activeLoanCount) { this.activeLoanCount = activeLoanCount; }
}
