package com.superdo.ai.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class MarriagePlannerRequest {

    @NotBlank(message = "Event name is required")
    @Size(max = 200, message = "Event name must not exceed 200 characters")
    private String eventName;

    @Size(max = 200, message = "Guest name must not exceed 200 characters")
    private String guestName;

    @Size(max = 100, message = "Vendor type must not exceed 100 characters")
    private String vendorType;

    @Size(max = 200, message = "Vendor name must not exceed 200 characters")
    private String vendorName;

    @Size(max = 200, message = "Vendor contact must not exceed 200 characters")
    private String vendorContact;

    @Size(max = 255, message = "Venue must not exceed 255 characters")
    private String venue;

    @Min(value = 0, message = "Guest count must be zero or positive")
    private Integer guestCount;

    @Size(max = 32, message = "Status must not exceed 32 characters")
    private String status;

    @DecimalMin(value = "0.00", message = "Budget amount must be zero or positive")
    @Digits(integer = 10, fraction = 2, message = "Budget amount must have at most 10 integer digits and 2 decimal places")
    private BigDecimal budgetAmount;

    @DecimalMin(value = "0.00", message = "Expense amount must be zero or positive")
    @Digits(integer = 10, fraction = 2, message = "Expense amount must have at most 10 integer digits and 2 decimal places")
    private BigDecimal expenseAmount;

    @NotNull(message = "Event date is required")
    private LocalDate eventDate;

    @Size(max = 5000, message = "Timeline note must not exceed 5,000 characters")
    private String timelineNote;

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }

    public String getVendorType() { return vendorType; }
    public void setVendorType(String vendorType) { this.vendorType = vendorType; }

    public String getVendorName() { return vendorName; }
    public void setVendorName(String vendorName) { this.vendorName = vendorName; }

    public String getVendorContact() { return vendorContact; }
    public void setVendorContact(String vendorContact) { this.vendorContact = vendorContact; }

    public String getVenue() { return venue; }
    public void setVenue(String venue) { this.venue = venue; }

    public Integer getGuestCount() { return guestCount; }
    public void setGuestCount(Integer guestCount) { this.guestCount = guestCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getBudgetAmount() { return budgetAmount; }
    public void setBudgetAmount(BigDecimal budgetAmount) { this.budgetAmount = budgetAmount; }

    public BigDecimal getExpenseAmount() { return expenseAmount; }
    public void setExpenseAmount(BigDecimal expenseAmount) { this.expenseAmount = expenseAmount; }

    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }

    public String getTimelineNote() { return timelineNote; }
    public void setTimelineNote(String timelineNote) { this.timelineNote = timelineNote; }
}
