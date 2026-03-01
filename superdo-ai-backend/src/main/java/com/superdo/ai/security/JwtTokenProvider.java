package com.superdo.ai.security;

import com.superdo.ai.entity.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Handles JWT access-token generation and validation.
 *
 * <p>Token claims layout:
 * <pre>
 *   sub        → user email
 *   userId     → database PK (Long)
 *   role       → UserRole name (e.g. "USER", "ADMIN")
 *   tokenType  → "access"  (guards against using refresh tokens as access tokens)
 *   jti        → random UUID (unique token ID)
 * </pre>
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);
    private static final String CLAIM_USER_ID   = "userId";
    private static final String CLAIM_ROLE      = "role";
    private static final String CLAIM_TOKEN_TYPE = "tokenType";
    private static final String ACCESS_TOKEN_TYPE = "access";

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;

    public JwtTokenProvider(@Value("${app.jwt.secret}") String secret,
                            @Value("${app.jwt.access-expiration-ms}") long accessTokenExpirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
    }

    // -------------------------------------------------------------------------
    // Token generation
    // -------------------------------------------------------------------------

    public String generateAccessToken(UserPrincipal principal) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .setSubject(principal.getUsername())
                .claim(CLAIM_USER_ID, principal.getId())
                .claim(CLAIM_ROLE, principal.getRole().name())
                .claim(CLAIM_TOKEN_TYPE, ACCESS_TOKEN_TYPE)
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    // -------------------------------------------------------------------------
    // Token parsing
    // -------------------------------------------------------------------------

    /**
     * Validates the token's signature, expiry, and token-type claim.
     * Returns {@code false} instead of throwing for invalid tokens.
     */
    public boolean validateToken(String token) {
        try {
            Claims claims = parseClaims(token);
            return ACCESS_TOKEN_TYPE.equals(claims.get(CLAIM_TOKEN_TYPE));
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("JWT validation failed: {}", ex.getMessage());
            return false;
        }
    }

    /**
     * Builds a {@link UserPrincipal} from a <em>verified</em> JWT without a
     * database lookup. Call only after {@link #validateToken(String)} returns
     * {@code true}.
     */
    public UserPrincipal buildPrincipalFromToken(String token) {
        Claims claims = parseClaims(token);

        String email  = claims.getSubject();
        Long userId   = extractUserId(claims);
        UserRole role = extractRole(claims);

        return new UserPrincipal(userId, email, null, null, role);
    }

    public long getAccessTokenExpirationMs() {
        return accessTokenExpirationMs;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Long extractUserId(Claims claims) {
        Object raw = claims.get(CLAIM_USER_ID);
        if (raw == null) {
            throw new JwtException("Missing userId claim");
        }
        return Long.valueOf(String.valueOf(raw));
    }

    private UserRole extractRole(Claims claims) {
        Object raw = claims.get(CLAIM_ROLE);
        if (raw == null) {
            throw new JwtException("Missing role claim");
        }
        try {
            return UserRole.valueOf(String.valueOf(raw));
        } catch (IllegalArgumentException ex) {
            throw new JwtException("Invalid role claim: " + raw);
        }
    }
}
