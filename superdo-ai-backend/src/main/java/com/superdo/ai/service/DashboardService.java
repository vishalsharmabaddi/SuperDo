package com.superdo.ai.service;

import com.superdo.ai.repository.ExpenseRepository;
import com.superdo.ai.repository.MarriagePlannerRepository;
import com.superdo.ai.repository.NoteRepository;
import com.superdo.ai.repository.RentRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class DashboardService {

    private final NoteRepository noteRepository;
    private final ExpenseRepository expenseRepository;
    private final RentRecordRepository rentRecordRepository;
    private final MarriagePlannerRepository marriagePlannerRepository;

    public DashboardService(NoteRepository noteRepository,
                            ExpenseRepository expenseRepository,
                            RentRecordRepository rentRecordRepository,
                            MarriagePlannerRepository marriagePlannerRepository) {
        this.noteRepository = noteRepository;
        this.expenseRepository = expenseRepository;
        this.rentRecordRepository = rentRecordRepository;
        this.marriagePlannerRepository = marriagePlannerRepository;
    }

    /**
     * Builds an overview using SQL COUNT aggregates rather than loading every
     * row into memory just to call .size() on the resulting list.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getOverview(Long userId) {
        Map<String, Object> overview = new LinkedHashMap<>();

        // Counts via SQL aggregates – O(1) DB cost regardless of data volume
        overview.put("totalNotes",    noteRepository.countByUserId(userId));
        overview.put("totalExpenses", expenseRepository.countByUserId(userId));

        // Rent: next pending payment
        overview.put("rentDue",
                rentRecordRepository.findByUserIdOrderByDueDateAsc(userId).stream()
                        .filter(r -> r.getPaymentStatus() != null
                                && "PENDING".equalsIgnoreCase(r.getPaymentStatus().name()))
                        .findFirst()
                        .map(r -> {
                            Map<String, Object> due = new LinkedHashMap<>();
                            due.put("amount",  r.getRentAmount());
                            due.put("dueDate", r.getDueDate());
                            return due;
                        })
                        .orElseGet(() -> {
                            Map<String, Object> empty = new LinkedHashMap<>();
                            empty.put("amount",  0);
                            empty.put("dueDate", LocalDate.now());
                            return empty;
                        })
        );

        // Upcoming events (today or later, max 5)
        overview.put("upcomingEvents",
                marriagePlannerRepository.findByUserIdOrderByEventDateAsc(userId).stream()
                        .filter(e -> e.getEventDate() != null && !e.getEventDate().isBefore(LocalDate.now()))
                        .limit(5)
                        .toList()
        );

        return overview;
    }
}
