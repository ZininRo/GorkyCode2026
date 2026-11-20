package com.gorkycode2026.backend.api.auth;

import com.gorkycode2026.backend.auth.dto.LoginRequest;
import com.gorkycode2026.backend.auth.dto.RegisterRequest;
import com.gorkycode2026.backend.auth.repository.RefreshTokenRepository;
import com.gorkycode2026.backend.auth.repository.UserAccountRepository;
import com.gorkycode2026.backend.auth.service.AuthService;
import com.gorkycode2026.backend.auth.service.JwtService;
import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.city.service.CityService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    private UserAccountRepository users;
    private AuthService service;

    @BeforeEach
    void setUp() {
        users = mock(UserAccountRepository.class);
        RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        JwtService jwt = mock(JwtService.class);
        CityService cityService = mock(CityService.class);
        when(encoder.encode(anyString())).thenReturn("dummy-hash");
        service = new AuthService(users, tokens, encoder, jwt, cityService, 7);
    }

    @Test
    void duplicateEmailIsCaseInsensitive() {
        when(users.existsByEmail("roman@example.com")).thenReturn(true);
        ApiException ex = assertThrows(ApiException.class, () ->
                service.register(new RegisterRequest("Roman", " Roman@Example.com ", "StrongPass123!", 1L)));
        assertEquals(HttpStatus.CONFLICT, ex.status());
        assertEquals("EMAIL_ALREADY_EXISTS", ex.code());
    }

    @Test
    void loginWithUnknownEmailDoesNotRevealAccountExistence() {
        when(users.findByEmail("nobody@example.com")).thenReturn(Optional.empty());
        ApiException ex = assertThrows(ApiException.class, () ->
                service.login(new LoginRequest("Nobody@Example.com", "wrong-password")));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.status());
        assertEquals("INVALID_CREDENTIALS", ex.code());
    }

    @Test
    void invalidRefreshCookieReturnsUnauthorized() {
        ApiException ex = assertThrows(ApiException.class, () -> service.refresh(null));
        assertEquals("INVALID_REFRESH_TOKEN", ex.code());
    }
}
