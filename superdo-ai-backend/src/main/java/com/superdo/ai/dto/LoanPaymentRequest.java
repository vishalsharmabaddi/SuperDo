package com.superdo.ai.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class LoanPaymentRequest {

    private LocalDate paidDate;

    @DecimalMin(value = "0.01", message = "Payment amount must be positive")
    @Digits(integer = 10, fraction = 2, message = "Payment amount format is invalid")
    private BigDecimal amount;

    private Boolean extraPayment;

    @Size(max = 500, message = "Note must not exceed 500 characters")
    private String note;

    public LocalDate getPaidDate() { return paidDate; }
    public void setPaidDate(LocalDate paidDate) { this.paidDate = paidDate; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Boolean getExtraPayment() { return extraPayment; }
    public void setExtraPayment(Boolean extraPayment) { this.extraPayment = extraPayment; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
