package com.gorkycode2026.backend.ai.dto;

import java.util.List;

/** JSON contract of the AI module. {@code source} = AI | FALLBACK. Owner: Рома. */
public final class AiDtos {
    private AiDtos() { }

    public record AiHintResponse(String checkpointId, String language, String text, String source) { }

    public record RecommendedPlace(String id, String title, String description, String tier) { }

    public record AiRecommendationsResponse(String level, String language, String intro, String source,
                                            List<RecommendedPlace> items) { }

    public record AiStatusResponse(boolean enabled, String model) { }
}
