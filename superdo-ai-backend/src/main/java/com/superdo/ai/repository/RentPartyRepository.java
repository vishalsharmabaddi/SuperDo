package com.superdo.ai.repository;

import com.superdo.ai.entity.RentParty;
import com.superdo.ai.entity.RentPartyRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RentPartyRepository extends JpaRepository<RentParty, Long> {

    List<RentParty> findByUserIdOrderByDisplayNameAsc(Long userId);

    List<RentParty> findByUserIdAndPreferredRoleOrderByDisplayNameAsc(Long userId, RentPartyRole role);

    Optional<RentParty> findFirstByUserIdAndPreferredRoleAndDisplayNameIgnoreCase(Long userId, RentPartyRole role, String displayName);
}
