package com.superdo.ai.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "loans")
public class Loan extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String loanName;

    @Column(nullable = false, length = 255)
    private String lenderName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private LoanType loanType;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalLoanAmount;

    @Column(nullable = false, precision = 7, scale = 4)
    private BigDecimal interestRateAnnual;

    @Column(nullable = false)
    private Integer tenureMonths;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private Integer emiDueDay;

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
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
