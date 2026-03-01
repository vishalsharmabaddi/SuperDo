package com.superdo.ai.service;

import com.superdo.ai.entity.RentParty;
import com.superdo.ai.entity.RentPartyRole;
import com.superdo.ai.entity.RentPartyType;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.RentPartyRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RentPartyService {

    private final RentPartyRepository rentPartyRepository;
    private final UserService userService;

    public RentPartyService(RentPartyRepository rentPartyRepository, UserService userService) {
        this.rentPartyRepository = rentPartyRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<RentParty> list(Long userId, RentPartyRole role) {
        if (role == null) {
            return rentPartyRepository.findByUserIdOrderByDisplayNameAsc(userId);
        }
        return rentPartyRepository.findByUserIdAndPreferredRoleOrderByDisplayNameAsc(userId, role);
    }

    @Transactional(readOnly = true)
    public RentParty getOwned(Long userId, Long partyId) {
        RentParty party = rentPartyRepository.findById(partyId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Rent party not found"));
        if (!party.getUser().getId().equals(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Rent party not found");
        }
        return party;
    }

    @Transactional
    public RentParty resolveOrCreate(Long userId, Long partyId, String fallbackName, RentPartyRole role) {
        if (partyId != null) {
            return getOwned(userId, partyId);
        }

        String normalized = fallbackName == null ? "" : fallbackName.trim();
        if (normalized.isBlank()) return null;

        return rentPartyRepository.findFirstByUserIdAndPreferredRoleAndDisplayNameIgnoreCase(userId, role, normalized)
                .orElseGet(() -> {
                    RentParty created = new RentParty();
                    created.setUser(userService.getRequiredUser(userId));
                    created.setDisplayName(normalized);
                    created.setPreferredRole(role);
                    created.setPartyType(RentPartyType.CONTACT);
                    return rentPartyRepository.save(created);
                });
    }
}
