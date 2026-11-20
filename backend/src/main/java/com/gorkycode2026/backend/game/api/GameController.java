package com.gorkycode2026.backend.game.api;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.game.dto.GameDtos.CheckpointDto;
import com.gorkycode2026.backend.game.dto.GameDtos.CheckpointDetailDto;
import com.gorkycode2026.backend.game.dto.GameDtos.MapCheckpointsDto;
import com.gorkycode2026.backend.game.dto.GameDtos.CollectRequest;
import com.gorkycode2026.backend.game.dto.GameDtos.CollectResponse;
import com.gorkycode2026.backend.game.dto.GameDtos.GameStateDto;
import com.gorkycode2026.backend.game.dto.GameDtos.ProgressDto;
import com.gorkycode2026.backend.game.service.GameService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Quest API. Every endpoint needs {@code Authorization: Bearer <accessToken>} from the existing
 * auth module; the user is the JWT subject. Owner: Юля.
 */
@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "bearerAuth")
public class GameController {
    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    /** Aggregated state for the map screen and the profile: progress, routes, visible checkpoints. */
    @GetMapping("/game")
    public GameStateDto game(@AuthenticationPrincipal Jwt jwt,
                             @RequestParam(name = "includeCheckpoints", defaultValue = "true") boolean includeCheckpoints) {
        UUID userId = userId(jwt);
        return includeCheckpoints ? gameService.getState(userId) : gameService.getSummary(userId);
    }

    /** Same checkpoints as in GET /game (only unlocked routes). */
    @GetMapping(value = "/checkpoints", params = "!bbox")
    public Map<String, List<CheckpointDto>> checkpoints(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("items", gameService.getState(userId(jwt)).checkpoints());
    }

    @GetMapping(value = "/checkpoints", params = "bbox")
    public MapCheckpointsDto mapCheckpoints(@AuthenticationPrincipal Jwt jwt, @RequestParam String bbox,
                                           @RequestParam(required = false) String routeId) {
        double[] bounds = parseBounds(bbox);
        if (routeId != null && (routeId.isBlank() || routeId.length() > 32)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Недопустимый идентификатор маршрута");
        }
        return gameService.getMapCheckpoints(userId(jwt), bounds[0], bounds[1], bounds[2], bounds[3], routeId);
    }

    @GetMapping("/checkpoints/{id}")
    public CheckpointDetailDto checkpoint(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        requireCheckpointId(id);
        return gameService.getCheckpointDetail(userId(jwt), id);
    }

    private static double[] parseBounds(String bbox) {
        String[] fields = bbox.split(",", -1);
        if (fields.length == 4 && bbox.length() <= 100) {
            try {
                double west = Double.parseDouble(fields[0]);
                double south = Double.parseDouble(fields[1]);
                double east = Double.parseDouble(fields[2]);
                double north = Double.parseDouble(fields[3]);
                if (west >= -180 && west < east && east <= 180 && south >= -90 && south < north && north <= 90) {
                    return new double[] {west, south, east, north};
                }
            } catch (NumberFormatException ignored) {
                // Invalid coordinates share the same validation response.
            }
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "bbox: ожидаются запад, юг, восток, север в градусах");
    }

    @GetMapping("/progress")
    public ProgressDto progress(@AuthenticationPrincipal Jwt jwt) {
        return gameService.getProgress(userId(jwt));
    }

    @PostMapping("/checkpoints/{id}/collect")
    public CollectResponse collect(@AuthenticationPrincipal Jwt jwt, @PathVariable("id") String id,
                                   @Valid @RequestBody CollectRequest body) {
        requireCheckpointId(id);
        return gameService.collect(userId(jwt), id, body);
    }

    private static void requireCheckpointId(String id) {
        if (id == null || id.isBlank() || id.length() > 32) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CHECKPOINT_NOT_FOUND", "Чекпоинт не найден");
        }
    }

    static UUID userId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (RuntimeException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Требуется авторизация");
        }
    }
}
