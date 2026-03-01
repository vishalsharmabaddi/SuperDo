package com.superdo.ai.dto;

public class AuthConfigResponse {

    private final String googleClientId;
    private final boolean googleEnabled;

    public AuthConfigResponse(String googleClientId, boolean googleEnabled) {
        this.googleClientId = googleClientId;
        this.googleEnabled = googleEnabled;
    }

    public String getGoogleClientId() {
        return googleClientId;
    }

    public boolean isGoogleEnabled() {
        return googleEnabled;
    }
}
