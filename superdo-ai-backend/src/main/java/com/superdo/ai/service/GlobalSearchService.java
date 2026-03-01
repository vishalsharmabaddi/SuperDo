package com.superdo.ai.service;

import com.superdo.ai.entity.CustomSection;
import com.superdo.ai.entity.CustomSectionEntry;
import com.superdo.ai.entity.Expense;
import com.superdo.ai.entity.MarriagePlanner;
import com.superdo.ai.entity.Note;
import com.superdo.ai.entity.RentRecord;
import com.superdo.ai.repository.CustomSectionEntryRepository;
import com.superdo.ai.repository.CustomSectionRepository;
import com.superdo.ai.repository.ExpenseRepository;
import com.superdo.ai.repository.MarriagePlannerRepository;
import com.superdo.ai.repository.NoteRepository;
import com.superdo.ai.repository.RentRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class GlobalSearchService {

    private static final int MAX_RESULTS_PER_CATEGORY = 20;

    private final NoteRepository noteRepository;
    private final ExpenseRepository expenseRepository;
    private final RentRecordRepository rentRecordRepository;
    private final MarriagePlannerRepository marriagePlannerRepository;
    private final CustomSectionRepository customSectionRepository;
    private final CustomSectionEntryRepository customSectionEntryRepository;

    public GlobalSearchService(NoteRepository noteRepository,
                               ExpenseRepository expenseRepository,
                               RentRecordRepository rentRecordRepository,
                               MarriagePlannerRepository marriagePlannerRepository,
                               CustomSectionRepository customSectionRepository,
                               CustomSectionEntryRepository customSectionEntryRepository) {
        this.noteRepository = noteRepository;
        this.expenseRepository = expenseRepository;
        this.rentRecordRepository = rentRecordRepository;
        this.marriagePlannerRepository = marriagePlannerRepository;
        this.customSectionRepository = customSectionRepository;
        this.customSectionEntryRepository = customSectionEntryRepository;
    }

    /**
     * Executes DB-level search queries for each module and returns a combined
     * result map.
     *
     * <p>When {@code query} is blank, falls back to "list all" queries so the
     * frontend can still display recent data. All result sets are capped at
     * {@value #MAX_RESULTS_PER_CATEGORY} items to limit response payload size.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> search(Long userId, String query) {
        String normalizedQuery = (query == null) ? "" : query.trim().toLowerCase(Locale.ROOT);
        boolean hasQuery = !normalizedQuery.isBlank();

        List<Note> notes = hasQuery
                ? noteRepository.searchByUserId(userId, normalizedQuery).stream()
                        .limit(MAX_RESULTS_PER_CATEGORY).toList()
                : noteRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                        .limit(MAX_RESULTS_PER_CATEGORY).toList();

        List<Expense> expenses = hasQuery
                ? expenseRepository.searchByUserId(userId, normalizedQuery).stream()
                        .limit(MAX_RESULTS_PER_CATEGORY).toList()
                : expenseRepository.findByUserIdOrderByTxnDateDesc(userId).stream()
                        .limit(MAX_RESULTS_PER_CATEGORY).toList();

        List<RentRecord> rentRecords = hasQuery
                ? rentRecordRepository.searchByUserId(userId, normalizedQuery).stream()
                        .limit(MAX_RESULTS_PER_CATEGORY).toList()
                : rentRecordRepository.findByUserIdOrderByDueDateAsc(userId).stream()
                        .limit(MAX_RESULTS_PER_CATEGORY).toList();

        List<MarriagePlanner> marriagePlannerItems = hasQuery
                ? marriagePlannerRepository.searchByUserId(userId, normalizedQuery).stream()
                        .limit(MAX_RESULTS_PER_CATEGORY).toList()
                : marriagePlannerRepository.findByUserIdOrderByEventDateAsc(userId).stream()
                        .limit(MAX_RESULTS_PER_CATEGORY).toList();

        // Custom sections – filter in Java since schema_json is JSONB with arbitrary structure
        List<CustomSection> allSections = customSectionRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        List<CustomSection> customSections = allSections.stream()
                .filter(s -> !hasQuery || containsIgnoreCase(s.getName(), normalizedQuery)
                        || containsIgnoreCase(s.getSchemaJson(), normalizedQuery))
                .limit(MAX_RESULTS_PER_CATEGORY)
                .toList();

        // Custom entries: filter in Java to avoid DB LOWER() on JSONB incompatibility.
        List<CustomSectionEntry> allEntries = customSectionEntryRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        List<CustomSectionEntry> customEntries = allEntries.stream()
                .filter(e -> !hasQuery || containsIgnoreCase(e.getDataJson(), normalizedQuery))
                .limit(MAX_RESULTS_PER_CATEGORY)
                .toList();

        int totalMatches = notes.size() + expenses.size() + rentRecords.size()
                + marriagePlannerItems.size() + customSections.size() + customEntries.size();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("query",          query == null ? "" : query.trim());
        result.put("notes",          notes);
        result.put("expenses",       expenses);
        result.put("rentRecords",    rentRecords);
        result.put("marriagePlanner", marriagePlannerItems);
        result.put("customSections", customSections);
        result.put("customEntries",  customEntries);
        result.put("totalMatches",   totalMatches);
        return result;
    }

    private boolean containsIgnoreCase(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }
}
