package com.superdo.ai.dto;

import java.util.List;

public class AuthResponse {

    private String accessToken;
    private long accessTokenExpiresInMs;
    private Long userId;
    private String email;
    private String fullName;
    private List<String> roles;

    public AuthResponse(String accessToken, long accessTokenExpiresInMs, Long userId, String email, String fullName, List<String> roles) {
        this.accessToken = accessToken;
        this.accessTokenExpiresInMs = accessTokenExpiresInMs;
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.roles = roles;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public long getAccessTokenExpiresInMs() {
        return accessTokenExpiresInMs;
    }

    public Long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public List<String> getRoles() {
        return roles;
    }
}
