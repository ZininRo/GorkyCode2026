package com.gorkycode2026.backend.ai.client;

import java.util.Optional;

/**
 * Minimal LLM abstraction. Implementations must never throw: any failure (disabled, timeout,
 * HTTP error, bad JSON) returns {@link Optional#empty()} so the caller can use a fallback.
 * Owner: Рома.
 */
public interface LlmClient {
    Optional<String> complete(String systemPrompt, String userPrompt);

    boolean isEnabled();

    String modelName();
}
