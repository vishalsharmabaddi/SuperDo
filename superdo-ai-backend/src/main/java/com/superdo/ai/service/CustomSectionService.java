package com.superdo.ai.service;

import com.superdo.ai.entity.CustomSection;
import com.superdo.ai.entity.CustomSectionEntry;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.CustomSectionEntryRepository;
import com.superdo.ai.repository.CustomSectionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CustomSectionService {

    private final CustomSectionRepository customSectionRepository;
    private final CustomSectionEntryRepository customSectionEntryRepository;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public CustomSectionService(CustomSectionRepository customSectionRepository,
                                CustomSectionEntryRepository customSectionEntryRepository,
                                UserService userService,
                                ObjectMapper objectMapper) {
        this.customSectionRepository = customSectionRepository;
        this.customSectionEntryRepository = customSectionEntryRepository;
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    public List<CustomSection> listSections(Long userId) {
        return customSectionRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public CustomSection createSection(Long userId, CustomSection section) {
        validateSection(section);
        section.setUser(userService.getRequiredUser(userId));
        return customSectionRepository.save(section);
    }

    public CustomSection updateSection(Long userId, Long sectionId, CustomSection input) {
        validateSection(input);
        CustomSection section = getOwnedSection(userId, sectionId);
        section.setName(input.getName());
        section.setSchemaJson(input.getSchemaJson());
        return customSectionRepository.save(section);
    }

    @Transactional
    public void deleteSection(Long userId, Long sectionId) {
        CustomSection section = getOwnedSection(userId, sectionId);
        customSectionEntryRepository.deleteByUserIdAndSectionId(userId, section.getId());
        customSectionRepository.delete(section);
    }

    public List<CustomSectionEntry> listEntries(Long userId, Long sectionId) {
        getOwnedSection(userId, sectionId);
        return customSectionEntryRepository.findByUserIdAndSectionIdOrderByUpdatedAtDesc(userId, sectionId);
    }

    public CustomSectionEntry createEntry(Long userId, Long sectionId, CustomSectionEntry entry) {
        CustomSection section = getOwnedSection(userId, sectionId);
        validateEntry(entry);
        entry.setSection(section);
        entry.setUser(userService.getRequiredUser(userId));
        return customSectionEntryRepository.save(entry);
    }

    public CustomSectionEntry updateEntry(Long userId, Long sectionId, Long entryId, CustomSectionEntry input) {
        getOwnedSection(userId, sectionId);
        validateEntry(input);
        CustomSectionEntry entry = getOwnedEntry(userId, sectionId, entryId);
        entry.setDataJson(input.getDataJson());
        return customSectionEntryRepository.save(entry);
    }

    public void deleteEntry(Long userId, Long sectionId, Long entryId) {
        getOwnedSection(userId, sectionId);
        customSectionEntryRepository.delete(getOwnedEntry(userId, sectionId, entryId));
    }

    private CustomSection getOwnedSection(Long userId, Long sectionId) {
        CustomSection section = customSectionRepository.findById(sectionId)
                .orElseThrow(() -> new ApiException("Section not found"));
        if (!section.getUser().getId().equals(userId)) {
            throw new ApiException("Unauthorized access to section");
        }
        return section;
    }

    private CustomSectionEntry getOwnedEntry(Long userId, Long sectionId, Long entryId) {
        CustomSectionEntry entry = customSectionEntryRepository.findById(entryId)
                .orElseThrow(() -> new ApiException("Entry not found"));
        if (!entry.getUser().getId().equals(userId)) {
            throw new ApiException("Unauthorized access to entry");
        }
        if (!entry.getSection().getId().equals(sectionId)) {
            throw new ApiException("Entry does not belong to the requested section");
        }
        return entry;
    }

    private void validateSection(CustomSection section) {
        if (section.getName() == null || section.getName().isBlank()) {
            throw new ApiException("Section name is required");
        }
        if (section.getSchemaJson() == null || section.getSchemaJson().isBlank()) {
            throw new ApiException("Section schema is required");
        }
        try {
            objectMapper.readTree(section.getSchemaJson());
        } catch (Exception e) {
            throw new ApiException("Section schema must be valid JSON");
        }
    }

    private void validateEntry(CustomSectionEntry entry) {
        if (entry.getDataJson() == null || entry.getDataJson().isBlank()) {
            throw new ApiException("Entry data is required");
        }
        try {
            objectMapper.readTree(entry.getDataJson());
        } catch (Exception e) {
            throw new ApiException("Entry data must be valid JSON");
        }
    }
}
