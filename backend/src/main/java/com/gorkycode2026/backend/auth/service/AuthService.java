package com.gorkycode2026.backend.auth.service;

import com.gorkycode2026.backend.auth.dto.AuthResponse;
import com.gorkycode2026.backend.auth.dto.LoginRequest;
import com.gorkycode2026.backend.auth.dto.RegisterRequest;
import com.gorkycode2026.backend.auth.dto.UserResponse;
import com.gorkycode2026.backend.auth.model.RefreshToken;
import com.gorkycode2026.backend.auth.model.UserAccount;
import com.gorkycode2026.backend.auth.repository.RefreshTokenRepository;
import com.gorkycode2026.backend.auth.repository.UserAccountRepository;
import com.gorkycode2026.backend.auth.web.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserAccountRepository users;
    private final RefreshTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long refreshTtlDays;
    private final String dummyPasswordHash;

    public record AuthSession(AuthResponse response, String refreshToken) { }

    public AuthService(UserAccountRepository users, RefreshTokenRepository tokens,
                       PasswordEncoder passwordEncoder, JwtService jwtService,
                       @Value("${app.auth.refresh-ttl-days}") long refreshTtlDays) {
        this.users = users;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTtlDays = refreshTtlDays;
        // Equalize the expensive password check for unknown email vs wrong password.
        this.dummyPasswordHash = passwordEncoder.encode("not-a-real-password");
    }

    @Transactional
    public AuthSession register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Этот email уже зарегистрирован");
        }
        UserAccount user = new UserAccount(email, request.displayName(), passwordEncoder.encode(request.password()));
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            // Covers concurrent registrations racing for the same unique email.
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Этот email уже зарегистрирован");
        }
        return issueSession(user, Instant.now());
    }

    @Transactional
    public AuthSession login(LoginRequest request) {
        UserAccount user = users.findByEmail(normalizeEmail(request.email())).orElse(null);
        String hash = user == null ? dummyPasswordHash : user.getPasswordHash();
        if (!passwordEncoder.matches(request.password(), hash) || user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Неверный email или пароль");
        }
        return issueSession(user, Instant.now());
    }

    @Transactional
    public AuthSession refresh(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidRefresh();
        }
        RefreshToken current = tokens.findLockedByHash(sha256(rawToken)).orElseThrow(AuthService::invalidRefresh);
        Instant now = Instant.now();
        if (current.getRevokedAt() != null || !current.getExpiresAt().isAfter(now)) {
            throw invalidRefresh();
        }
        current.revoke(now);
        return issueSession(current.getUser(), now);
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        tokens.findLockedByHash(sha256(rawToken)).ifPresent(current -> {
            if (current.getRevokedAt() == null) current.revoke(Instant.now());
        });
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(String subject) {
        UUID id;
        try {
            id = UUID.fromString(subject);
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Требуется авторизация");
        }
        UserAccount user = users.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Требуется авторизация"));
        return UserResponse.from(user);
    }

    private AuthSession issueSession(UserAccount user, Instant now) {
        byte[] random = new byte[32];
        RANDOM.nextBytes(random);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        tokens.save(new RefreshToken(user, sha256(raw), now, now.plus(refreshTtlDays, ChronoUnit.DAYS)));
        AuthResponse response = new AuthResponse(jwtService.issueAccessToken(user, now),
                "Bearer", jwtService.accessTtlSeconds(), UserResponse.from(user));
        return new AuthSession(response, raw);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String sha256(String value) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private static ApiException invalidRefresh() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Сессия истекла. Войдите снова.");
    }
}
