package com.gorkycode2026.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 60) String displayName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 128) String password
) {
    public RegisterRequest {
        if (displayName != null) displayName = displayName.trim();
        if (email != null) email = email.trim();
    }
}
