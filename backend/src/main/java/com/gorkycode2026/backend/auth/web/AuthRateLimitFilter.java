package com.gorkycode2026.backend.auth.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.filter.OncePerRequestFilter;

/** Basic per-IP, per-endpoint fixed-window limit for a single Docker instance (MVP). */
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final long WINDOW_MILLIS = Duration.ofMinutes(1).toMillis();
    private static final int LIMIT = 20;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final ObjectMapper mapper;

    public AuthRateLimitFilter(ObjectMapper mapper) { this.mapper = mapper; }

    private static class Window {
        long beginsAt;
        int count;
        Window(long now) { beginsAt = now; }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return true;
        String route = request.getServletPath();
        return !route.equals("/api/v1/auth/register")
                && !route.equals("/api/v1/auth/login")
                && !route.equals("/api/v1/auth/refresh");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long now = System.currentTimeMillis();
        String key = request.getRemoteAddr() + ":" + request.getServletPath();
        Window window = windows.computeIfAbsent(key, unused -> new Window(now));
        boolean limited;
        long retryAfter;
        synchronized (window) {
            if (now - window.beginsAt >= WINDOW_MILLIS) {
                window.beginsAt = now;
                window.count = 0;
            }
            limited = ++window.count > LIMIT;
            retryAfter = Math.max(1, (window.beginsAt + WINDOW_MILLIS - now + 999) / 1000);
        }
        // Periodically release old keys; never trust client-controlled X-Forwarded-For.
        if (windows.size() > 10000) {
            windows.entrySet().removeIf(e -> now - e.getValue().beginsAt > WINDOW_MILLIS * 2);
        }
        if (limited) {
            response.setHeader("Retry-After", Long.toString(retryAfter));
            ApiErrorWriter.write(response, mapper, 429, "TOO_MANY_REQUESTS", "Слишком много попыток. Попробуйте позже.");
            return;
        }
        chain.doFilter(request, response);
    }
}
