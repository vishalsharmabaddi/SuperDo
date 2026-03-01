package com.superdo.ai.controller;

import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.GlobalSearchService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class GlobalSearchController {

    private final GlobalSearchService globalSearchService;

    public GlobalSearchController(GlobalSearchService globalSearchService) {
        this.globalSearchService = globalSearchService;
    }

    @GetMapping("/global")
    public Map<String, Object> global(@AuthenticationPrincipal UserPrincipal principal,
                                      @RequestParam(required = false) String query) {
        return globalSearchService.search(principal.getId(), query);
    }
}
