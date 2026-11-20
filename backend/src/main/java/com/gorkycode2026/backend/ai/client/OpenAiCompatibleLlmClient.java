package com.gorkycode2026.backend.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Client for any OpenAI-compatible {@code POST /chat/completions} endpoint (OpenAI, OpenRouter,
 * a local Ollama/vLLM, a corporate gateway...). Uses only the JDK HTTP client and Jackson that
 * are already on the classpath, so no new Maven dependency is needed.
 *
 * <p>Configuration (environment variables, all optional):
 * AI_ENABLED (default false), AI_BASE_URL, AI_API_KEY, AI_MODEL, AI_TIMEOUT_SECONDS,
 * AI_PROJECT (optional; sent as OpenAI-Project header, needed for Yandex Cloud folder ID).
 * The API key is never logged. Owner: Рома.
 */
@Component
public class OpenAiCompatibleLlmClient implements LlmClient {
    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleLlmClient.class);

    private final ObjectMapper mapper;
    private final boolean enabled;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final String project;
    private final Duration timeout;
    private final HttpClient http;

    public OpenAiCompatibleLlmClient(ObjectMapper mapper,
                                     @Value("${AI_ENABLED:false}") boolean enabled,
                                     @Value("${AI_BASE_URL:https://api.openai.com/v1}") String baseUrl,
                                     @Value("${AI_API_KEY:}") String apiKey,
                                     @Value("${AI_MODEL:gpt-4o-mini}") String model,
                                     @Value("${AI_TIMEOUT_SECONDS:8}") int timeoutSeconds,
                                     @Value("${AI_PROJECT:}") String project) {
        this.mapper = mapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.project = project == null ? "" : project.trim();
        this.timeout = Duration.ofSeconds(Math.max(1, timeoutSeconds));
        this.enabled = enabled && !this.apiKey.isEmpty();
        this.http = HttpClient.newBuilder().connectTimeout(this.timeout).build();
        if (enabled && this.apiKey.isEmpty()) {
            log.warn("AI_ENABLED=true but AI_API_KEY is empty: AI endpoints will use fallback texts");
        }
        log.info("LLM client: enabled={}, baseUrl={}, model={}", this.enabled, this.baseUrl, this.model);
    }

    @Override
    public boolean isEnabled() { return enabled; }

    @Override
    public String modelName() { return model; }

    @Override
    public Optional<String> complete(String systemPrompt, String userPrompt) {
        if (!enabled) return Optional.empty();
        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", model);
            body.put("temperature", 0.4);
            body.put("max_tokens", 220);
            ArrayNode messages = body.putArray("messages");
            messages.addObject().put("role", "system").put("content", systemPrompt);
            messages.addObject().put("role", "user").put("content", userPrompt);

            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey);
            if (!project.isEmpty()) {
                // Yandex Cloud: folder ID в заголовке OpenAI-Project (как в официальном примере)
                builder.header("OpenAI-Project", project);
            }
            HttpRequest request = builder
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() / 100 != 2) {
                log.warn("LLM HTTP {}: fallback will be used", response.statusCode());
                return Optional.empty();
            }
            // readTree: unaffected by the global fail-on-unknown-properties setting.
            JsonNode content = mapper.readTree(response.body()).path("choices").path(0).path("message").path("content");
            if (!content.isTextual() || content.asText().isBlank()) return Optional.empty();
            return Optional.of(content.asText().trim());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("LLM call failed ({}): fallback will be used", ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
