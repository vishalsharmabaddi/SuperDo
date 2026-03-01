package com.superdo.ai.controller;

import com.superdo.ai.dto.AiRequest;
import com.superdo.ai.dto.AiResponse;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.AiRateLimitService;
import com.superdo.ai.service.AiService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final AiRateLimitService aiRateLimitService;

    public AiController(AiService aiService, AiRateLimitService aiRateLimitService) {
        this.aiService = aiService;
        this.aiRateLimitService = aiRateLimitService;
    }

    @PostMapping("/summarize")
    public AiResponse summarize(@AuthenticationPrincipal UserPrincipal principal,
                                @Valid @RequestBody AiRequest request) {
        aiRateLimitService.checkOrThrow(principal.getId());
        return new AiResponse(aiService.summarize(request.getContent()));
    }

    @PostMapping("/grammar")
    public AiResponse grammar(@AuthenticationPrincipal UserPrincipal principal,
                              @Valid @RequestBody AiRequest request) {
        aiRateLimitService.checkOrThrow(principal.getId());
        return new AiResponse(aiService.improveGrammar(request.getContent()));
    }

    @PostMapping("/action-items")
    public AiResponse actionItems(@AuthenticationPrincipal UserPrincipal principal,
                                  @Valid @RequestBody AiRequest request) {
        aiRateLimitService.checkOrThrow(principal.getId());
        return new AiResponse(aiService.extractActionItems(request.getContent()));
    }

    @PostMapping("/suggest-title")
    public AiResponse suggestTitle(@AuthenticationPrincipal UserPrincipal principal,
                                   @Valid @RequestBody AiRequest request) {
        aiRateLimitService.checkOrThrow(principal.getId());
        return new AiResponse(aiService.suggestTitle(request.getContent()));
    }
}
