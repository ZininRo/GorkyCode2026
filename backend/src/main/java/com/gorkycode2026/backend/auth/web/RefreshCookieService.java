package com.gorkycode2026.backend.auth.web;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshCookieService {
    private static final String NAME = "refresh_token";
    private static final String PATH = "/api/v1/auth";
    private final boolean secure;
    private final Duration ttl;

    public RefreshCookieService(@Value("${app.auth.cookie-secure}") boolean secure,
                                @Value("${app.auth.refresh-ttl-days}") long days) {
        this.secure = secure;
        this.ttl = Duration.ofDays(days);
    }

    public String setCookie(String rawToken) {
        return cookie(rawToken, ttl);
    }

    public String clearCookie() {
        return cookie("", Duration.ZERO);
    }

    private String cookie(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path(PATH)
                .maxAge(maxAge)
                .build()
                .toString();
    }
}
