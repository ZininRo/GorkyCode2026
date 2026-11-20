package com.gorkycode2026.backend.game.api;

import com.gorkycode2026.backend.game.dto.GameDtos.CollectRequest;
import com.gorkycode2026.backend.game.dto.QuestDtos.*;
import com.gorkycode2026.backend.game.service.QuestService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@SecurityRequirement(name = "bearerAuth")
public class QuestController {
    private final QuestService service;

    public QuestController(QuestService service) { this.service = service; }

    @GetMapping("/quests")
    public Catalog catalog(@AuthenticationPrincipal Jwt jwt) {
        return service.catalog(GameController.userId(jwt));
    }

    @PostMapping("/quests/{questId}/start")
    public RunView start(@AuthenticationPrincipal Jwt jwt, @PathVariable String questId) {
        return service.start(GameController.userId(jwt), questId);
    }

    @GetMapping("/quest-runs")
    public History history(@AuthenticationPrincipal Jwt jwt) {
        return service.history(GameController.userId(jwt));
    }

    @GetMapping("/quest-runs/{runId}")
    public RunView run(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID runId) {
        return service.view(GameController.userId(jwt), runId);
    }

    @PostMapping("/quest-runs/{runId}/steps/{position}/collect")
    public ClaimResult collect(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID runId,
                               @PathVariable int position, @RequestBody @Valid CollectRequest request) {
        return service.collect(GameController.userId(jwt), runId, position, request);
    }

    @PutMapping("/quest-runs/{runId}/steps/{position}/reaction")
    public RunView react(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID runId,
                         @PathVariable int position, @RequestBody @Valid ReactionRequest request) {
        return service.react(GameController.userId(jwt), runId, position, request.reaction());
    }
}
