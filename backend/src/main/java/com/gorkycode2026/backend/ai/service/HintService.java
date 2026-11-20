package com.gorkycode2026.backend.ai.service;

import com.gorkycode2026.backend.ai.client.LlmClient;
import com.gorkycode2026.backend.ai.dto.AiDtos.AiHintResponse;
import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.game.readapi.GameReadApi;
import com.gorkycode2026.backend.game.readapi.GameReadApi.CheckpointFacts;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Short historical hint for a collected checkpoint. The LLM only rephrases verified facts from the
 * game DB; on any failure the verified hint itself is returned (source=FALLBACK), so the game never
 * depends on the model. Owner: Рома.
 */
@Service
public class HintService {
    static final int MAX_HINT_LENGTH = 400;

    private static final String SYSTEM_PROMPT = """
            You write short, intriguing hints for a city quest in Nizhny Novgorod.
            Use ONLY the facts given by the user. Never add new names, dates, numbers, places or legends.
            Answer with 1-2 sentences, at most 300 characters, no lists, no links, no quotes.
            """;

    private final GameReadApi game;
    private final LlmClient llm;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public HintService(GameReadApi game, LlmClient llm) {
        this.game = game;
        this.llm = llm;
    }

    public AiHintResponse hint(UUID userId, String checkpointId, String language) {
        String lang = Language.normalize(language);
        CheckpointFacts facts = game.findCheckpointFacts(checkpointId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "CHECKPOINT_NOT_FOUND", "Чекпоинт не найден"));
        if (!game.isCollected(userId, checkpointId)) {
            // A hint opens only after a successful collect.
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_COLLECTED", "Сначала соберите этот кристалл");
        }
        String verifiedHint = "en".equals(lang) ? facts.hintEn() : facts.hintRu();
        String key = checkpointId + ":" + lang;
        String cached = cache.get(key);
        if (cached != null) return new AiHintResponse(checkpointId, lang, cached, "AI");

        String factsText = factsText(facts, lang);
        Optional<String> generated = llm.complete(SYSTEM_PROMPT, prompt(facts, lang, factsText))
                .flatMap(text -> AiTextGuard.accept(text, factsText, MAX_HINT_LENGTH));
        if (generated.isPresent()) {
            cache.put(key, generated.get());
            return new AiHintResponse(checkpointId, lang, generated.get(), "AI");
        }
        return new AiHintResponse(checkpointId, lang, verifiedHint, "FALLBACK");
    }

    private static String factsText(CheckpointFacts facts, String lang) {
        boolean en = "en".equals(lang);
        StringBuilder text = new StringBuilder();
        text.append(en ? facts.titleEn() : facts.titleRu()).append(". ");
        text.append(en ? facts.hintEn() : facts.hintRu());
        String place = en ? facts.placeDescriptionEn() : facts.placeDescriptionRu();
        if (place != null) text.append(' ').append(place);
        return text.toString();
    }

    private static String prompt(CheckpointFacts facts, String lang, String factsText) {
        return "Language: " + ("en".equals(lang) ? "English" : "Russian") + "\n"
                + "Crystal type: " + facts.type() + "\n"
                + "Verified facts: " + factsText + "\n"
                + "Write the hint now.";
    }
}
