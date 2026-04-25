package com.superdo.ai.controller;

import com.superdo.ai.entity.User;
import com.superdo.ai.repository.UserRepository;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AiService aiService;

    @PostMapping("/message")
    public ResponseEntity<?> chat(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestBody Map<String, String> body) {

        if (userPrincipal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        String email = userPrincipal.getUsername();
        String message = body.get("message");

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        String aiType = hasText(user.getPreferredAi())
                ? user.getPreferredAi().trim().toLowerCase(Locale.ROOT)
                : "claude";

        try {
            if ("claude".equals(aiType) && hasText(user.getClaudeApiKey())) {
                String reply = callClaude(user.getClaudeApiKey().trim(), message);
                return ResponseEntity.ok(Map.of(
                        "reply", reply,
                        "mode", "personal_ai",
                        "modeLabel", "Personal Claude"
                ));
            }

            if ("openai".equals(aiType) && hasText(user.getOpenaiApiKey())) {
                String reply = callOpenAI(user.getOpenaiApiKey().trim(), message);
                return ResponseEntity.ok(Map.of(
                        "reply", reply,
                        "mode", "personal_ai",
                        "modeLabel", "Personal OpenAI"
                ));
            }
        } catch (Exception ex) {
            String fallbackReply = aiService.assistantReply(message);
            return ResponseEntity.ok(Map.of(
                    "reply", fallbackReply,
                    "mode", "built_in",
                    "modeLabel", "Built-in Assistant",
                    "notice", "Personal AI key failed, so built-in assistant mode is active."
            ));
        }

        String fallbackReply = aiService.assistantReply(message);
        return ResponseEntity.ok(Map.of(
                "reply", fallbackReply,
                "mode", "built_in",
                "modeLabel", "Built-in Assistant"
        ));
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    @SuppressWarnings("unchecked")
    private String callClaude(String apiKey, String message) {
        WebClient client = WebClient.create("https://api.anthropic.com");

        Map<String, Object> request = Map.of(
            "model", "claude-3-haiku-20240307",
            "max_tokens", 1024,
            "messages", List.of(
                Map.of("role", "user", "content", message)
            )
        );

        Map<String, Object> response = client.post()
            .uri("/v1/messages")
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
        Map<String, Object> firstContent = content.get(0);
        return (String) firstContent.get("text");
    }

    @SuppressWarnings("unchecked")
    private String callOpenAI(String apiKey, String message) {
        WebClient client = WebClient.create("https://api.openai.com");

        Map<String, Object> request = Map.of(
            "model", "gpt-3.5-turbo",
            "messages", List.of(
                Map.of("role", "user", "content", message)
            )
        );

        Map<String, Object> response = client.post()
            .uri("/v1/chat/completions")
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        Map<String, Object> firstChoice = choices.get(0);
        Map<String, Object> msg = (Map<String, Object>) firstChoice.get("message");
        return (String) msg.get("content");
    }
}
