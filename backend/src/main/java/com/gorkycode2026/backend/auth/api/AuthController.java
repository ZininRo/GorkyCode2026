package com.gorkycode2026.backend.auth.api;

import com.gorkycode2026.backend.auth.dto.AuthResponse;
import com.gorkycode2026.backend.auth.dto.LoginRequest;
import com.gorkycode2026.backend.auth.dto.RegisterRequest;
import com.gorkycode2026.backend.auth.service.AuthService;
import com.gorkycode2026.backend.auth.web.RefreshCookieService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;
    private final RefreshCookieService cookies;

    public AuthController(AuthService authService, RefreshCookieService cookies) {
        this.authService = authService;
        this.cookies = cookies;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest body) {
        return withCookie(authService.register(body), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest body) {
        return withCookie(authService.login(body), HttpStatus.OK);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@CookieValue(value = "refresh_token", required = false) String token) {
        return withCookie(authService.refresh(token), HttpStatus.OK);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(value = "refresh_token", required = false) String token) {
        authService.logout(token);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clearCookie()).build();
    }

    private ResponseEntity<AuthResponse> withCookie(AuthService.AuthSession session, HttpStatus status) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, cookies.setCookie(session.refreshToken()))
                .body(session.response());
    }
}
