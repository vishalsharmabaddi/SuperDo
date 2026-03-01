package com.superdo.ai.service;

import com.superdo.ai.dto.MarriagePlannerRequest;
import com.superdo.ai.entity.MarriagePlanner;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.MarriagePlannerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MarriagePlannerService {

    private static final Logger log = LoggerFactory.getLogger(MarriagePlannerService.class);

    private final MarriagePlannerRepository marriagePlannerRepository;
    private final UserService userService;

    public MarriagePlannerService(MarriagePlannerRepository marriagePlannerRepository, UserService userService) {
        this.marriagePlannerRepository = marriagePlannerRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<MarriagePlanner> list(Long userId) {
        return marriagePlannerRepository.findByUserIdOrderByEventDateAsc(userId);
    }

    @Transactional
    public MarriagePlanner create(Long userId, MarriagePlannerRequest request) {
        MarriagePlanner planner = new MarriagePlanner();
        planner.setUser(userService.getRequiredUser(userId));
        applyRequest(planner, request);
        MarriagePlanner saved = marriagePlannerRepository.save(planner);
        log.debug("MarriagePlanner created id={} for userId={}", saved.getId(), userId);
        return saved;
    }

    @Transactional
    public MarriagePlanner update(Long userId, Long id, MarriagePlannerRequest request) {
        MarriagePlanner planner = getOwned(userId, id);
        applyRequest(planner, request);
        MarriagePlanner saved = marriagePlannerRepository.save(planner);
        log.debug("MarriagePlanner updated id={} for userId={}", id, userId);
        return saved;
    }

    @Transactional
    public void delete(Long userId, Long id) {
        marriagePlannerRepository.delete(getOwned(userId, id));
        log.debug("MarriagePlanner deleted id={} for userId={}", id, userId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private MarriagePlanner getOwned(Long userId, Long id) {
        MarriagePlanner planner = marriagePlannerRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Planner record not found"));
        if (!planner.getUser().getId().equals(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Planner record not found");
        }
        return planner;
    }

    private void applyRequest(MarriagePlanner planner, MarriagePlannerRequest request) {
        planner.setEventName(request.getEventName().trim());
        planner.setGuestName(request.getGuestName());
        planner.setVendorType(request.getVendorType());
        planner.setVendorName(request.getVendorName());
        planner.setVendorContact(request.getVendorContact());
        planner.setVenue(request.getVenue());
        planner.setGuestCount(request.getGuestCount());
        planner.setStatus(request.getStatus());
        planner.setBudgetAmount(request.getBudgetAmount());
        planner.setExpenseAmount(request.getExpenseAmount());
        planner.setEventDate(request.getEventDate());
        planner.setTimelineNote(request.getTimelineNote());
    }
}
