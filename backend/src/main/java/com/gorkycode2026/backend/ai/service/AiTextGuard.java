package com.gorkycode2026.backend.ai.service;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Post-check of LLM output (pure Java, unit-testable without Spring). Rejects text that is empty,
 * too long, contains links, or mentions numbers (dates, counts) that are absent from the verified
 * facts, so the model cannot present invented dates as history. Owner: Рома.
 */
public final class AiTextGuard {
    private static final Pattern NUMBER = Pattern.compile("\\d+");

    private AiTextGuard() { }

    public static Optional<String> accept(String candidate, String verifiedFacts, int maxLength) {
        if (candidate == null) return Optional.empty();
        String text = candidate.strip()
                .replaceAll("^[\"«“']+|[\"»”']+$", "")
                .replaceAll("\\s+", " ")
                .strip();
        if (text.isEmpty() || text.length() > maxLength) return Optional.empty();
        String lower = text.toLowerCase();
        if (lower.contains("http://") || lower.contains("https://") || lower.contains("www.")) return Optional.empty();
        String facts = verifiedFacts == null ? "" : verifiedFacts;
        Matcher numbers = NUMBER.matcher(text);
        while (numbers.find()) {
            if (!facts.contains(numbers.group())) return Optional.empty();
        }
        return Optional.of(text);
    }
}
