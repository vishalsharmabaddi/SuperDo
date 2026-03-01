package com.superdo.ai.controller;

import com.superdo.ai.dto.RentRecordRequest;
import com.superdo.ai.entity.RentRecord;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.RentRecordService;
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
@RequestMapping("/api/rent-records")
public class RentRecordController {

    private final RentRecordService rentRecordService;

    public RentRecordController(RentRecordService rentRecordService) {
        this.rentRecordService = rentRecordService;
    }

    @GetMapping
    public List<RentRecord> list(@AuthenticationPrincipal UserPrincipal principal) {
        return rentRecordService.list(principal.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RentRecord create(@AuthenticationPrincipal UserPrincipal principal,
                             @Valid @RequestBody RentRecordRequest request) {
        return rentRecordService.create(principal.getId(), request);
    }

    @PutMapping("/{id}")
    public RentRecord update(@AuthenticationPrincipal UserPrincipal principal,
                             @PathVariable Long id,
                             @Valid @RequestBody RentRecordRequest request) {
        return rentRecordService.update(principal.getId(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal principal,
                       @PathVariable Long id) {
        rentRecordService.delete(principal.getId(), id);
    }
}
