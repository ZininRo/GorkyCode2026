package com.gorkycode2026.backend.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.gorkycode2026.backend.ai.service.AiTextGuard;
import org.junit.jupiter.api.Test;

/** Owner: Рома. */
class AiTextGuardTest {
    private static final String FACTS = "Кремль построен в 1508–1515 годах, 13 башен.";

    @Test
    void acceptsTextWithKnownNumbers() {
        assertEquals("В кремле 13 башен!", AiTextGuard.accept("«В кремле 13 башен!»", FACTS, 300).orElseThrow());
    }

    @Test
    void rejectsInventedNumbersLinksAndEmpty() {
        assertTrue(AiTextGuard.accept("Кремль построен в 1700 году", FACTS, 300).isEmpty());
        assertTrue(AiTextGuard.accept("Подробнее: https://example.com", FACTS, 300).isEmpty());
        assertTrue(AiTextGuard.accept("   ", FACTS, 300).isEmpty());
        assertTrue(AiTextGuard.accept(null, FACTS, 300).isEmpty());
        assertTrue(AiTextGuard.accept("x".repeat(301), FACTS, 300).isEmpty());
    }
}
