package com.gorkycode2026.backend.auth.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Auth cookies are sent by browsers. Require a known Origin on all POST /auth routes
 * so that cookies cannot be used by another site to refresh/logout a session.
 */
public class OriginVerificationFilter extends OncePerRequestFilter {
    private final Set<String> origins;
    private final ObjectMapper mapper;

    public OriginVerificationFilter(String csv, ObjectMapper mapper) {
        this.origins = Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod())
                || !request.getServletPath().startsWith("/api/v1/auth/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        if (origin == null || !origins.contains(origin)) {
            ApiErrorWriter.write(response, mapper, 403, "FORBIDDEN_ORIGIN", "Недопустимый Origin");
            return;
        }
        chain.doFilter(request, response);
    }
}
