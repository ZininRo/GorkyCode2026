package com.gorkycode2026.backend.auth.dto;

import com.gorkycode2026.backend.auth.model.UserAccount;
import java.time.Instant;
import java.util.UUID;

public record UserResponse(UUID id, String displayName, String email, Instant createdAt) {
    public static UserResponse from(UserAccount user) {
        return new UserResponse(user.getId(), user.getDisplayName(), user.getEmail(), user.getCreatedAt());
    }
}
