package com.gorkycode2026.backend.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gorkycode2026.backend.ai.client.LlmClient;
import com.gorkycode2026.backend.ai.dto.AiDtos.AiRecommendationsResponse;
import com.gorkycode2026.backend.ai.dto.AiDtos.RecommendedPlace;
import com.gorkycode2026.backend.game.readapi.GameReadApi;
import com.gorkycode2026.backend.game.readapi.GameReadApi.PlayerSnapshot;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/**
 * Level-based recommendations from a curated list (resources/ai/places.json):
 * NOVICE -> popular places, EXPLORER -> lesser-known places. The LLM writes only a short intro
 * about the already selected places; the list itself never comes from the model. Owner: Рома.
 */
@Service
public class RecommendationService {
    private static final int MAX_INTRO_LENGTH = 300;
    private static final String SYSTEM_PROMPT = """
            You are a friendly city guide in Nizhny Novgorod. Write ONE short sentence (max 200 characters)
            inviting the tourist to visit the listed places. Mention only places from the list.
            Do not add dates, numbers, facts, links or new places.
            """;

    private final GameReadApi game;
    private final LlmClient llm;
    private final List<Place> places;

    record Place(String id, String tier, String titleRu, String titleEn, String descriptionRu, String descriptionEn) { }

    public RecommendationService(GameReadApi game, LlmClient llm, ObjectMapper mapper) throws IOException {
        this.game = game;
        this.llm = llm;
        this.places = loadPlaces(mapper);
    }

    public AiRecommendationsResponse recommend(UUID userId, String language) {
        String lang = Language.normalize(language);
        boolean en = "en".equals(lang);
        PlayerSnapshot player = game.playerSnapshot(userId);
        String tier = "NOVICE".equals(player.level()) ? "POPULAR" : "HIDDEN";

        List<RecommendedPlace> items = places.stream()
                .filter(place -> place.tier().equals(tier))
                .map(place -> new RecommendedPlace(place.id(), en ? place.titleEn() : place.titleRu(),
                        en ? place.descriptionEn() : place.descriptionRu(), place.tier()))
                .toList();

        String names = items.stream().map(RecommendedPlace::title).collect(Collectors.joining(", "));
        Optional<String> intro = llm.complete(SYSTEM_PROMPT,
                        "Language: " + (en ? "English" : "Russian") + "\nTourist level: " + player.level()
                                + "\nPlaces: " + names)
                .flatMap(text -> AiTextGuard.accept(text, names, MAX_INTRO_LENGTH));

        String fallbackIntro = "POPULAR".equals(tier)
                ? (en ? "Start with the city's main symbols:" : "Начните с главных символов города:")
                : (en ? "You are an explorer now — try places beyond the postcards:"
                      : "Вы теперь исследователь — загляните в места за пределами открыток:");
        return new AiRecommendationsResponse(player.level(), lang, intro.orElse(fallbackIntro),
                intro.isPresent() ? "AI" : "FALLBACK", items);
    }

    private static List<Place> loadPlaces(ObjectMapper mapper) throws IOException {
        try (InputStream in = new ClassPathResource("ai/places.json").getInputStream()) {
            JsonNode root = mapper.readTree(in);
            List<Place> result = new ArrayList<>();
            for (JsonNode node : root.path("places")) {
                result.add(new Place(node.path("id").asText(), node.path("tier").asText(),
                        node.path("title").path("ru").asText(), node.path("title").path("en").asText(),
                        node.path("description").path("ru").asText(), node.path("description").path("en").asText()));
            }
            return List.copyOf(result);
        }
    }
}
