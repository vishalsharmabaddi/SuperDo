package com.superdo.ai.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@Table(name = "rent_records")
public class RentRecord extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 200)
    private String tenantName;

    @Column(length = 200)
    private String landlordName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "payer_party_id")
    private RentParty payerParty;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "receiver_party_id")
    private RentParty receiverParty;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal rentAmount;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PaymentStatus paymentStatus;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, length = 7)
    private String monthKey;

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTenantName() { return tenantName; }
    public void setTenantName(String tenantName) { this.tenantName = tenantName; }
    public String getLandlordName() { return landlordName; }
    public void setLandlordName(String landlordName) { this.landlordName = landlordName; }
    @JsonIgnore
    public RentParty getPayerParty() { return payerParty; }
    public void setPayerParty(RentParty payerParty) { this.payerParty = payerParty; }
    @JsonIgnore
    public RentParty getReceiverParty() { return receiverParty; }
    public void setReceiverParty(RentParty receiverParty) { this.receiverParty = receiverParty; }
    @JsonProperty("payerPartyId")
    public Long getPayerPartyId() { return payerParty == null ? null : payerParty.getId(); }
    @JsonProperty("receiverPartyId")
    public Long getReceiverPartyId() { return receiverParty == null ? null : receiverParty.getId(); }
    @JsonProperty("payerDisplayName")
    public String getPayerDisplayName() {
        if (tenantName != null && !tenantName.isBlank()) return tenantName;
        return payerParty == null ? null : payerParty.getDisplayName();
    }
    @JsonProperty("receiverDisplayName")
    public String getReceiverDisplayName() {
        if (landlordName != null && !landlordName.isBlank()) return landlordName;
        return receiverParty == null ? null : receiverParty.getDisplayName();
    }
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
}
