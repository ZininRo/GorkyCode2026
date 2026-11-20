package com.gorkycode2026.backend.ai.api;

import com.gorkycode2026.backend.ai.client.LlmClient;
import com.gorkycode2026.backend.ai.dto.AiDtos.AiHintResponse;
import com.gorkycode2026.backend.ai.dto.AiDtos.AiRecommendationsResponse;
import com.gorkycode2026.backend.ai.dto.AiDtos.AiStatusResponse;
import com.gorkycode2026.backend.ai.service.HintService;
import com.gorkycode2026.backend.ai.service.RecommendationService;
import com.gorkycode2026.backend.auth.web.ApiException;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** AI endpoints. They never change game progress. Owner: Рома. */
@RestController
@RequestMapping("/api/v1/ai")
@SecurityRequirement(name = "bearerAuth")
public class AiController {
    private final HintService hints;
    private final RecommendationService recommendations;
    private final LlmClient llm;

    public AiController(HintService hints, RecommendationService recommendations, LlmClient llm) {
        this.hints = hints;
        this.recommendations = recommendations;
        this.llm = llm;
    }

    @GetMapping("/hint")
    public AiHintResponse hint(@AuthenticationPrincipal Jwt jwt,
                               @RequestParam(value = "checkpointId", required = false) String checkpointId,
                               @RequestParam(value = "lang", required = false, defaultValue = "ru") String lang) {
        if (checkpointId == null || checkpointId.isBlank() || checkpointId.length() > 32) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Нужен параметр checkpointId");
        }
        return hints.hint(userId(jwt), checkpointId.trim(), lang);
    }

    @GetMapping("/recommendations")
    public AiRecommendationsResponse recommendations(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "lang", required = false, defaultValue = "ru") String lang) {
        return recommendations.recommend(userId(jwt), lang);
    }

    @GetMapping("/status")
    public AiStatusResponse status() {
        return new AiStatusResponse(llm.isEnabled(), llm.isEnabled() ? llm.modelName() : null);
    }

    private static UUID userId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (RuntimeException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Требуется авторизация");
        }
    }
}
