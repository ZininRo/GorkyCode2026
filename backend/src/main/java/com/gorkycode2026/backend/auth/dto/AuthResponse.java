package com.gorkycode2026.backend.auth.dto;

public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserResponse user) {
}
