package com.superdo.ai.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter.
 *
 * <p>Builds the {@link UserPrincipal} directly from the verified JWT claims
 * instead of hitting the database on every request. This is safe because:
 * <ul>
 *   <li>The token signature is cryptographically verified before claims are trusted.</li>
 *   <li>Access tokens have a short TTL (15 min), limiting the window for stale data.</li>
 * </ul>
 *
 * <p>A database lookup on every request would add latency and unnecessary load.
 * If immediate revocation is needed, use the refresh-token rotation flow.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String jwt = header.substring(BEARER_PREFIX.length());

            if (jwtTokenProvider.validateToken(jwt)) {
                try {
                    UserPrincipal principal = jwtTokenProvider.buildPrincipalFromToken(jwt);

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);

                } catch (Exception ex) {
                    log.warn("Could not build principal from JWT for request [{}]: {}",
                            request.getRequestURI(), ex.getMessage());
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
