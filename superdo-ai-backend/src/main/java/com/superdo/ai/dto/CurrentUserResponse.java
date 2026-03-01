package com.superdo.ai.dto;

import java.util.List;

public class CurrentUserResponse {
    private final Long userId;
    private final String email;
    private final String fullName;
    private final List<String> roles;

    public CurrentUserResponse(Long userId, String email, String fullName, List<String> roles) {
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.roles = roles;
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
