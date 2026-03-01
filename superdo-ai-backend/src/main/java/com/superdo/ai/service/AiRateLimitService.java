package com.superdo.ai.service;

import com.superdo.ai.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AiRateLimitService {

    private static final long CLEANUP_EVERY_N_CALLS = 200;

    private final Map<Long, Deque<Long>> userRequestTimestamps = new ConcurrentHashMap<>();
    private final int maxRequests;
    private final long windowMs;
    private long callCount = 0;

    public AiRateLimitService(
            @Value("${app.ai.rate-limit.max-requests:20}") int maxRequests,
            @Value("${app.ai.rate-limit.window-ms:60000}") long windowMs
    ) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    public void checkOrThrow(Long userId) {
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "User context is missing");
        }
        if (maxRequests <= 0 || windowMs <= 0) {
            return;
        }

        long now = Instant.now().toEpochMilli();
        Deque<Long> window = userRequestTimestamps.computeIfAbsent(userId, k -> new ArrayDeque<>());

        synchronized (window) {
            evictExpired(window, now);
            if (window.size() >= maxRequests) {
                long retryAfterMs = Math.max(1, windowMs - (now - window.peekFirst()));
                long retryAfterSec = (retryAfterMs + 999) / 1000;
                throw new ApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "AI rate limit exceeded. Try again in " + retryAfterSec + " seconds."
                );
            }
            window.addLast(now);
        }

        maybeCleanup(now);
    }

    private void evictExpired(Deque<Long> window, long now) {
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

        userRequestTimestamps.entrySet().removeIf(entry -> {
            Deque<Long> q = entry.getValue();
            synchronized (q) {
                evictExpired(q, now);
                return q.isEmpty();
            }
        });
    }
}
