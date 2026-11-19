package com.gorkycode2026.backend.api.auth;

import com.gorkycode2026.backend.auth.web.RefreshCookieService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class RefreshCookieServiceTest {
    @Test
    void refreshCookieIsHttpOnlyAndScopedToAuth() {
        String cookie = new RefreshCookieService(false, 7).setCookie("test-token");
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("SameSite=Lax"));
        assertTrue(cookie.contains("Path=/api/v1/auth"));
        assertTrue(cookie.contains("Max-Age=604800"));
    }

    @Test
    void logoutClearsSameCookie() {
        String cookie = new RefreshCookieService(true, 7).clearCookie();
        assertTrue(cookie.contains("Max-Age=0"));
        assertTrue(cookie.contains("Secure"));
        assertTrue(cookie.contains("Path=/api/v1/auth"));
    }
}
