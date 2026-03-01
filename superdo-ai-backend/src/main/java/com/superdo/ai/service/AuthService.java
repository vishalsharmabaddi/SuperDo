package com.superdo.ai.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.superdo.ai.dto.*;
import com.superdo.ai.entity.AuthProvider;
import com.superdo.ai.entity.RefreshToken;
import com.superdo.ai.entity.User;
import com.superdo.ai.entity.UserRole;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.RefreshTokenRepository;
import com.superdo.ai.repository.UserRepository;
import com.superdo.ai.security.JwtTokenProvider;
import com.superdo.ai.security.UserPrincipal;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@Service
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthCookieService authCookieService;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;

    private final long refreshTokenExpirationMs;
    private final String googleClientId;
    private final Set<String> adminEmails;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider,
            AuthCookieService authCookieService,
            @Value("${app.auth.refresh-token-expiration-ms:2592000000}") long refreshTokenExpirationMs,
            @Value("${app.auth.google-client-id:}") String googleClientId,
            @Value("${app.auth.admin-emails:}") String adminEmails
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authCookieService = authCookieService;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        this.googleClientId = googleClientId;
        this.adminEmails = parseAdminEmails(adminEmails);
        this.googleIdTokenVerifier = buildGoogleIdTokenVerifier(googleClientId);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        String normalizedEmail = request.getEmail().toLowerCase(Locale.ROOT).trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setEmailVerified(true);
        user.setRole(resolveRoleForEmail(normalizedEmail));
        userRepository.save(user);

        return issueSession(user, response);
    }

    @Transactional
    public AuthResponse login(AuthRequest request, HttpServletResponse response) {
        String normalizedEmail = request.getEmail().toLowerCase(Locale.ROOT).trim();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Use Google sign-in for this account");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
            );
            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            return issueSession(userRepository.findById(principal.getId()).orElse(user), response);
        } catch (BadCredentialsException | DisabledException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
    }

    @Transactional
    public AuthResponse googleLogin(GoogleAuthRequest request, HttpServletResponse response) {
        GoogleUserInfo googleUserInfo = validateGoogleIdToken(request.getIdToken());
        if (!googleUserInfo.emailVerified()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google account email is not verified");
        }

        User user = userRepository.findByGoogleSubject(googleUserInfo.sub()).orElseGet(() ->
                userRepository.findByEmail(googleUserInfo.email())
                        .orElseGet(() -> {
                            User created = new User();
                            created.setEmail(googleUserInfo.email());
                            created.setFullName(googleUserInfo.name());
                            created.setAuthProvider(AuthProvider.GOOGLE);
                            created.setEmailVerified(true);
                            created.setRole(resolveRoleForEmail(googleUserInfo.email()));
                            return created;
                        }));

        user.setGoogleSubject(googleUserInfo.sub());
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            user.setAuthProvider(AuthProvider.GOOGLE);
        }
        user.setEmailVerified(true);
        if (user.getFullName() == null || user.getFullName().isBlank()) {
            user.setFullName(googleUserInfo.name());
        }
        user = userRepository.save(user);

        return issueSession(user, response);
    }

    @Transactional
    public AuthResponse refreshSession(String refreshToken, HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Missing refresh token");
        }
        String tokenHash = hash(refreshToken);

        RefreshToken persisted = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (persisted.isRevoked() || persisted.getExpiresAt().isBefore(Instant.now())) {
            revokeAllSessions(persisted.getUser().getId());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token is expired or revoked");
        }

        persisted.setRevoked(true);
        refreshTokenRepository.save(persisted);

        User user = persisted.getUser();
        return issueSession(user, response);
    }

    @Transactional
    public void logout(String refreshToken, HttpServletResponse response) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenRepository.findByTokenHash(hash(refreshToken)).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        }
        authCookieService.clearRefreshTokenCookie(response);
        authCookieService.clearCsrfTokenCookie(response);
    }

    public CurrentUserResponse currentUser(UserPrincipal principal) {
        return new CurrentUserResponse(
                principal.getId(),
                principal.getUsername(),
                principal.getFullName(),
                List.of("ROLE_" + principal.getRole().name())
        );
    }

    public AuthConfigResponse authConfig() {
        boolean googleEnabled = googleClientId != null && !googleClientId.isBlank();
        return new AuthConfigResponse(googleEnabled ? googleClientId : null, googleEnabled);
    }

    public String resolveEmailByRefreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return null;
        }
        return refreshTokenRepository.findByTokenHash(hash(refreshToken))
                .map(RefreshToken::getUser)
                .map(User::getEmail)
                .map(value -> value.toLowerCase(Locale.ROOT).trim())
                .orElse(null);
    }

    private AuthResponse issueSession(User user, HttpServletResponse response) {
        user = syncRoleWithAdminPolicy(user);
        UserPrincipal principal = UserPrincipal.create(user);
        String accessToken = jwtTokenProvider.generateAccessToken(principal);

        TokenPair tokenPair = issueRefreshToken(user);
        String csrfToken = generateCsrfToken();
        authCookieService.writeRefreshTokenCookie(response, tokenPair.plainToken(), tokenPair.maxAgeSeconds());
        authCookieService.writeCsrfTokenCookie(response, csrfToken, tokenPair.maxAgeSeconds());

        return new AuthResponse(
                accessToken,
                jwtTokenProvider.getAccessTokenExpirationMs(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                List.of("ROLE_" + user.getRole().name())
        );
    }

    private User syncRoleWithAdminPolicy(User user) {
        UserRole expectedRole = resolveRoleForEmail(user.getEmail());
        if (user.getRole() != expectedRole) {
            user.setRole(expectedRole);
            return userRepository.save(user);
        }
        return user;
    }

    private TokenPair issueRefreshToken(User user) {
        String plainToken = generateRefreshToken();
        Instant expiresAt = Instant.now().plusMillis(refreshTokenExpirationMs);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hash(plainToken));
        refreshToken.setExpiresAt(expiresAt);
        refreshTokenRepository.save(refreshToken);

        return new TokenPair(plainToken, refreshTokenExpirationMs / 1000L);
    }

    private void revokeAllSessions(Long userId) {
        List<RefreshToken> activeTokens = refreshTokenRepository.findByUser_IdAndRevokedFalse(userId);
        for (RefreshToken token : activeTokens) {
            token.setRevoked(true);
        }
        refreshTokenRepository.saveAll(activeTokens);
    }

    private GoogleUserInfo validateGoogleIdToken(String idToken) {
        if (googleIdTokenVerifier == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Google login is not configured");
        }

        GoogleIdToken googleIdToken;
        try {
            googleIdToken = googleIdTokenVerifier.verify(idToken);
        } catch (GeneralSecurityException | IOException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
        }
        if (googleIdToken == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
        }

        GoogleIdToken.Payload payload = googleIdToken.getPayload();
        if (payload == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
        }

        String aud = stringValue(payload.getAudience());
        if (!googleClientId.equals(aud) && (payload.getAudienceAsList() == null || !payload.getAudienceAsList().contains(googleClientId))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google token audience mismatch");
        }

        String issuer = stringValue(payload.getIssuer());
        if (!"https://accounts.google.com".equals(issuer) && !"accounts.google.com".equals(issuer)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google token issuer mismatch");
        }

        Long expirationSeconds = payload.getExpirationTimeSeconds();
        if (expirationSeconds == null || expirationSeconds <= Instant.now().getEpochSecond()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google token expired");
        }

        String email = stringValue(payload.getEmail()).toLowerCase(Locale.ROOT).trim();
        String sub = stringValue(payload.getSubject());
        String name = stringValue(payload.get("name"));
        boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());

        if (email.isBlank() || sub.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google token payload is incomplete");
        }
        return new GoogleUserInfo(sub, email, name == null || name.isBlank() ? email : name, emailVerified);
    }

    private UserRole resolveRoleForEmail(String email) {
        return adminEmails.contains(email.toLowerCase(Locale.ROOT)) ? UserRole.ADMIN : UserRole.USER;
    }

    private Set<String> parseAdminEmails(String adminEmails) {
        if (adminEmails == null || adminEmails.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(adminEmails.split(","))
                .map(value -> value.toLowerCase(Locale.ROOT).trim())
                .filter(value -> !value.isBlank())
                .collect(java.util.stream.Collectors.toSet());
    }

    private String generateRefreshToken() {
        byte[] bytes = new byte[64];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String generateCsrfToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private GoogleIdTokenVerifier buildGoogleIdTokenVerifier(String clientId) {
        if (clientId == null || clientId.isBlank()) {
            return null;
        }
        try {
            return new GoogleIdTokenVerifier.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance()
            )
                    .setAudience(Collections.singletonList(clientId))
                    .setIssuers(List.of("https://accounts.google.com", "accounts.google.com"))
                    .build();
        } catch (GeneralSecurityException | IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Google verifier initialization failed");
        }
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashed);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Token hashing failed");
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private record TokenPair(String plainToken, long maxAgeSeconds) { }

    private record GoogleUserInfo(String sub, String email, String name, boolean emailVerified) { }
}
