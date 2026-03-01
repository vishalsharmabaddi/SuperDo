package com.superdo.ai.dto;

import com.superdo.ai.entity.PaymentStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class RentRecordRequest {

    @Size(max = 200, message = "Tenant name must not exceed 200 characters")
    private String tenantName;

    @Size(max = 200, message = "Landlord name must not exceed 200 characters")
    private String landlordName;

    @NotNull(message = "Rent amount is required")
    @DecimalMin(value = "0.01", message = "Rent amount must be a positive number")
    @Digits(integer = 10, fraction = 2, message = "Rent amount must have at most 10 integer digits and 2 decimal places")
    private BigDecimal rentAmount;

    @NotNull(message = "Due date is required")
    private LocalDate dueDate;

    @NotNull(message = "Payment status is required")
    private PaymentStatus paymentStatus;

    @Size(max = 2000, message = "Notes must not exceed 2,000 characters")
    private String notes;

    @Size(max = 7, message = "Month key must be in YYYY-MM format")
    private String monthKey;

    @Positive(message = "Payer party id must be positive")
    private Long payerPartyId;

    @Positive(message = "Receiver party id must be positive")
    private Long receiverPartyId;

    public String getTenantName() { return tenantName; }
    public void setTenantName(String tenantName) { this.tenantName = tenantName; }

    public String getLandlordName() { return landlordName; }
    public void setLandlordName(String landlordName) { this.landlordName = landlordName; }

    public BigDecimal getRentAmount() { return rentAmount; }
    public void setRentAmount(BigDecimal rentAmount) { this.rentAmount = rentAmount; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getMonthKey() { return monthKey; }
    public void setMonthKey(String monthKey) { this.monthKey = monthKey; }

    public Long getPayerPartyId() { return payerPartyId; }
    public void setPayerPartyId(Long payerPartyId) { this.payerPartyId = payerPartyId; }

    public Long getReceiverPartyId() { return receiverPartyId; }
    public void setReceiverPartyId(Long receiverPartyId) { this.receiverPartyId = receiverPartyId; }
}
