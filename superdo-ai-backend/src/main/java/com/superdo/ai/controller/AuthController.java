package com.superdo.ai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.superdo.ai.dto.*;
import com.superdo.ai.security.UserPrincipal;
import com.superdo.ai.service.AuthCookieService;
import com.superdo.ai.service.AuthRateLimitService;
import com.superdo.ai.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;
    private final AuthRateLimitService authRateLimitService;
    private final ObjectMapper objectMapper;

    public AuthController(AuthService authService,
                          AuthCookieService authCookieService,
                          AuthRateLimitService authRateLimitService,
                          ObjectMapper objectMapper) {
        this.authService = authService;
        this.authCookieService = authCookieService;
        this.authRateLimitService = authRateLimitService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        return authService.register(request, response);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request,
                              HttpServletRequest httpRequest,
                              HttpServletResponse response) {
        authRateLimitService.checkLoginOrThrow(resolveClientIp(httpRequest), request.getEmail());
        return authService.login(request, response);
    }

    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleAuthRequest request,
                               HttpServletRequest httpRequest,
                               HttpServletResponse response) {
        String emailHint = extractEmailFromIdToken(request.getIdToken());
        authRateLimitService.checkGoogleOrThrow(resolveClientIp(httpRequest), emailHint);
        return authService.googleLogin(request, response);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshToken(request);
        String email = authService.resolveEmailByRefreshToken(refreshToken);
        authRateLimitService.checkRefreshOrThrow(resolveClientIp(request), email);
        return authService.refreshSession(refreshToken, response);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(extractRefreshToken(request), response);
    }

    @GetMapping("/me")
    public CurrentUserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.currentUser(principal);
    }

    @GetMapping("/config")
    public AuthConfigResponse config() {
        return authService.authConfig();
    }

    private String extractRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null || cookies.length == 0) {
            return null;
        }
        String cookieName = authCookieService.getRefreshCookieName();
        for (Cookie cookie : cookies) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] parts = forwarded.split(",");
            if (parts.length > 0) {
                return parts[0].trim();
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private String extractEmailFromIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            return null;
        }
        String[] chunks = idToken.split("\\.");
        if (chunks.length < 2) {
            return null;
        }
        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(chunks[1]);
            String payload = new String(payloadBytes, StandardCharsets.UTF_8);
            Map<String, Object> body = objectMapper.readValue(payload, Map.class);
            Object email = body.get("email");
            return email == null ? null : String.valueOf(email);
        } catch (Exception ignored) {
            return null;
        }
    }
}
