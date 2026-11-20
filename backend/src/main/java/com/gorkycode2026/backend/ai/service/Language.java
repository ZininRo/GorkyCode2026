package com.gorkycode2026.backend.ai.service;

import java.util.Locale;

/** ru | en, anything else -> ru. Owner: Рома. */
final class Language {
    private Language() { }

    static String normalize(String language) {
        if (language == null) return "ru";
        String value = language.trim().toLowerCase(Locale.ROOT);
        return value.startsWith("en") ? "en" : "ru";
    }
}
