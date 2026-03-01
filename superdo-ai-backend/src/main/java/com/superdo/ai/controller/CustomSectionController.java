package com.superdo.ai.controller;

import com.superdo.ai.entity.CustomSection;
import com.superdo.ai.entity.CustomSectionEntry;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.CustomSectionService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/custom-sections")
public class CustomSectionController {

    private final CustomSectionService customSectionService;

    public CustomSectionController(CustomSectionService customSectionService) {
        this.customSectionService = customSectionService;
    }

    @GetMapping
    public List<CustomSection> list(@AuthenticationPrincipal UserPrincipal principal) {
        return customSectionService.listSections(principal.getId());
    }

    @PostMapping
    public CustomSection create(@AuthenticationPrincipal UserPrincipal principal, @RequestBody CustomSection section) {
        return customSectionService.createSection(principal.getId(), section);
    }

    @PutMapping("/{sectionId}")
    public CustomSection update(@AuthenticationPrincipal UserPrincipal principal,
                                @PathVariable Long sectionId,
                                @RequestBody CustomSection section) {
        return customSectionService.updateSection(principal.getId(), sectionId, section);
    }

    @DeleteMapping("/{sectionId}")
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long sectionId) {
        customSectionService.deleteSection(principal.getId(), sectionId);
    }

    @GetMapping("/{sectionId}/entries")
    public List<CustomSectionEntry> listEntries(@AuthenticationPrincipal UserPrincipal principal,
                                                @PathVariable Long sectionId) {
        return customSectionService.listEntries(principal.getId(), sectionId);
    }

    @PostMapping("/{sectionId}/entries")
    public CustomSectionEntry createEntry(@AuthenticationPrincipal UserPrincipal principal,
                                          @PathVariable Long sectionId,
                                          @RequestBody CustomSectionEntry entry) {
        return customSectionService.createEntry(principal.getId(), sectionId, entry);
    }

    @PutMapping("/{sectionId}/entries/{entryId}")
    public CustomSectionEntry updateEntry(@AuthenticationPrincipal UserPrincipal principal,
                                          @PathVariable Long sectionId,
                                          @PathVariable Long entryId,
                                          @RequestBody CustomSectionEntry entry) {
        return customSectionService.updateEntry(principal.getId(), sectionId, entryId, entry);
    }

    @DeleteMapping("/{sectionId}/entries/{entryId}")
    public void deleteEntry(@AuthenticationPrincipal UserPrincipal principal,
                            @PathVariable Long sectionId,
                            @PathVariable Long entryId) {
        customSectionService.deleteEntry(principal.getId(), sectionId, entryId);
    }
}