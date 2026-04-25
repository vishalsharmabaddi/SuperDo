package com.superdo.ai.controller;

import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/keys")
@CrossOrigin(origins = "*")
public class ApiKeyController {

    @Autowired
    private AuthService authService;

    @PostMapping("/save")
    public ResponseEntity<?> saveKeys(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestBody Map<String, String> body) {

        if (userPrincipal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Please login first"));
        }

        String email = userPrincipal.getUsername();

        authService.saveApiKeys(
            email,
            body.get("claudeKey"),
            body.get("openaiKey"),
            body.get("preferredAi")
        );

        return ResponseEntity.ok(Map.of("message", "Keys saved!"));
    }

    @GetMapping("/status")
    public ResponseEntity<?> keyStatus(
        @AuthenticationPrincipal UserPrincipal userPrincipal) {

        if (userPrincipal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Please login first"));
        }

        String email = userPrincipal.getUsername();
        Map<String, Object> status = authService.getApiKeyStatus(email);
        return ResponseEntity.ok(status);
    }
}
