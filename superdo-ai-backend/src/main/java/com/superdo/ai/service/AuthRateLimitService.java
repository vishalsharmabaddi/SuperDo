package com.superdo.ai.service;

import com.superdo.ai.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthRateLimitService {

    private static final long CLEANUP_EVERY_N_CALLS = 200;
    private static final String UNKNOWN = "unknown";

    private final Map<String, Deque<Long>> requestTimestamps = new ConcurrentHashMap<>();
    private final int loginMaxRequests;
    private final long loginWindowMs;
    private final int googleMaxRequests;
    private final long googleWindowMs;
    private final int refreshMaxRequests;
    private final long refreshWindowMs;
    private long callCount = 0;

    public AuthRateLimitService(
            @Value("${app.auth.rate-limit.login.max-requests:8}") int loginMaxRequests,
            @Value("${app.auth.rate-limit.login.window-ms:300000}") long loginWindowMs,
            @Value("${app.auth.rate-limit.google.max-requests:8}") int googleMaxRequests,
            @Value("${app.auth.rate-limit.google.window-ms:300000}") long googleWindowMs,
            @Value("${app.auth.rate-limit.refresh.max-requests:25}") int refreshMaxRequests,
            @Value("${app.auth.rate-limit.refresh.window-ms:300000}") long refreshWindowMs
    ) {
        this.loginMaxRequests = loginMaxRequests;
        this.loginWindowMs = loginWindowMs;
        this.googleMaxRequests = googleMaxRequests;
        this.googleWindowMs = googleWindowMs;
        this.refreshMaxRequests = refreshMaxRequests;
        this.refreshWindowMs = refreshWindowMs;
    }

    public void checkLoginOrThrow(String clientIp, String email) {
        checkOrThrow("login", clientIp, email, loginMaxRequests, loginWindowMs);
    }

    public void checkGoogleOrThrow(String clientIp, String emailHint) {
        checkOrThrow("google", clientIp, emailHint, googleMaxRequests, googleWindowMs);
    }

    public void checkRefreshOrThrow(String clientIp, String email) {
        checkOrThrow("refresh", clientIp, email, refreshMaxRequests, refreshWindowMs);
    }

    private void checkOrThrow(String scope, String clientIp, String email, int maxRequests, long windowMs) {
        if (maxRequests <= 0 || windowMs <= 0) {
            return;
        }

        String key = scope + "|" + normalize(clientIp) + "|" + normalize(email);
        long now = Instant.now().toEpochMilli();
        Deque<Long> window = requestTimestamps.computeIfAbsent(key, k -> new ArrayDeque<>());

        synchronized (window) {
            evictExpired(window, now, windowMs);
            if (window.size() >= maxRequests) {
                long retryAfterMs = Math.max(1, windowMs - (now - window.peekFirst()));
                long retryAfterSec = (retryAfterMs + 999) / 1000;
                throw new ApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Too many " + scope + " attempts. Try again in " + retryAfterSec + " seconds."
                );
            }
            window.addLast(now);
        }

        maybeCleanup(now);
    }

    private String normalize(String value) {
        if (value == null) {
            return UNKNOWN;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return UNKNOWN;
        }
        if (normalized.length() > 254) {
            return normalized.substring(0, 254);
        }
        return normalized;
    }

    private void evictExpired(Deque<Long> window, long now, long windowMs) {
        while (!window.isEmpty() && (now - window.peekFirst()) >= windowMs) {
            window.pollFirst();
        }
    }

    private void maybeCleanup(long now) {
        synchronized (this) {
            callCount++;
            if (callCount % CLEANUP_EVERY_N_CALLS != 0) {
                return;
            }
        }

        requestTimestamps.entrySet().removeIf(entry -> {
            String key = entry.getKey();
            long windowMs = windowMsForKey(key);
            Deque<Long> q = entry.getValue();
            synchronized (q) {
                evictExpired(q, now, windowMs);
                return q.isEmpty();
            }
        });
    }

    private long windowMsForKey(String key) {
        if (key.startsWith("login|")) {
            return loginWindowMs;
        }
        if (key.startsWith("google|")) {
            return googleWindowMs;
        }
        return refreshWindowMs;
    }
}
