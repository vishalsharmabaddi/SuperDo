package com.superdo.ai.controller;

import com.superdo.ai.entity.RentParty;
import com.superdo.ai.entity.RentPartyRole;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.RentPartyService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rent-parties")
public class RentPartyController {

    private final RentPartyService rentPartyService;

    public RentPartyController(RentPartyService rentPartyService) {
        this.rentPartyService = rentPartyService;
    }

    @GetMapping
    public List<RentParty> list(@AuthenticationPrincipal UserPrincipal principal,
                                @RequestParam(required = false) RentPartyRole role) {
        return rentPartyService.list(principal.getId(), role);
    }
}
