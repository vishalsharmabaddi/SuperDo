package com.superdo.ai.service;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class AuthCookieService {

    private final String refreshCookieName;
    private final boolean refreshCookieSecure;
    private final String refreshCookieSameSite;
    private final String csrfCookieName;
    private final String csrfHeaderName;

    public AuthCookieService(
            @Value("${app.auth.refresh-cookie-name:superdo_refresh}") String refreshCookieName,
            @Value("${app.auth.refresh-cookie-secure:false}") boolean refreshCookieSecure,
            @Value("${app.auth.refresh-cookie-same-site:Lax}") String refreshCookieSameSite,
            @Value("${app.auth.csrf-cookie-name:superdo_csrf}") String csrfCookieName,
            @Value("${app.auth.csrf-header-name:X-CSRF-Token}") String csrfHeaderName
    ) {
        this.refreshCookieName = refreshCookieName;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieSameSite = refreshCookieSameSite;
        this.csrfCookieName = csrfCookieName;
        this.csrfHeaderName = csrfHeaderName;
    }

    public void writeRefreshTokenCookie(HttpServletResponse response, String refreshToken, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, refreshToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/api/auth/refresh")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void writeCsrfTokenCookie(HttpServletResponse response, String csrfToken, long maxAgeSeconds) {
        ResponseCookie cookie = ResponseCookie.from(csrfCookieName, csrfToken)
                .httpOnly(false)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/")
                .maxAge(maxAgeSeconds)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/api/auth/refresh")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearCsrfTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(csrfCookieName, "")
                .httpOnly(false)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public String getRefreshCookieName() {
        return refreshCookieName;
    }

    public String getCsrfCookieName() {
        return csrfCookieName;
    }

    public String getCsrfHeaderName() {
        return csrfHeaderName;
    }
}
