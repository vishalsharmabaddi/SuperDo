package com.superdo.ai.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public class LoanPaymentResponse {

    private Long id;
    private LocalDate paidDate;
    private BigDecimal amount;
    private boolean extraPayment;
    private String note;
    private Instant createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getPaidDate() { return paidDate; }
    public void setPaidDate(LocalDate paidDate) { this.paidDate = paidDate; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public boolean isExtraPayment() { return extraPayment; }
    public void setExtraPayment(boolean extraPayment) { this.extraPayment = extraPayment; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
