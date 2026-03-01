package com.superdo.ai.controller;

import com.superdo.ai.dto.MarriagePlannerRequest;
import com.superdo.ai.entity.MarriagePlanner;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.MarriagePlannerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/marriage-planner")
public class MarriagePlannerController {

    private final MarriagePlannerService marriagePlannerService;

    public MarriagePlannerController(MarriagePlannerService marriagePlannerService) {
        this.marriagePlannerService = marriagePlannerService;
    }

    @GetMapping
    public List<MarriagePlanner> list(@AuthenticationPrincipal UserPrincipal principal) {
        return marriagePlannerService.list(principal.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MarriagePlanner create(@AuthenticationPrincipal UserPrincipal principal,
                                  @Valid @RequestBody MarriagePlannerRequest request) {
        return marriagePlannerService.create(principal.getId(), request);
    }

    @PutMapping("/{id}")
    public MarriagePlanner update(@AuthenticationPrincipal UserPrincipal principal,
                                  @PathVariable Long id,
                                  @Valid @RequestBody MarriagePlannerRequest request) {
        return marriagePlannerService.update(principal.getId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal principal,
                       @PathVariable Long id) {
        marriagePlannerService.delete(principal.getId(), id);
    }
}
