package com.gorkycode2026.backend.game.api;

import com.gorkycode2026.backend.game.dto.GameDtos.CollectRequest;
import com.gorkycode2026.backend.game.service.GuidedService;
import com.gorkycode2026.backend.game.service.GuidedService.Snapshot;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/guided")
@SecurityRequirement(name = "bearerAuth")
public class GuidedController {
    public record ReactionBody(@NotNull String reaction) { }
    public record BookmarkBody(@NotNull Boolean saved) { }

    private final GuidedService service;
    public GuidedController(GuidedService service) { this.service = service; }

    @GetMapping
    public Snapshot state(@AuthenticationPrincipal Jwt jwt) {
        return service.state(GameController.userId(jwt));
    }

    @PostMapping("/{quest}/start")
    public Snapshot start(@AuthenticationPrincipal Jwt jwt, @PathVariable String quest) {
        return service.start(GameController.userId(jwt), quest);
    }

    @PostMapping("/{quest}/stops/{index}/collect")
    public Snapshot collect(@AuthenticationPrincipal Jwt jwt, @PathVariable String quest, @PathVariable int index,
                            @Valid @RequestBody CollectRequest position) {
        return service.collect(GameController.userId(jwt), quest, index, position);
    }

    @PutMapping("/{quest}/stops/{index}/reaction")
    public Snapshot react(@AuthenticationPrincipal Jwt jwt, @PathVariable String quest, @PathVariable int index,
                          @Valid @RequestBody ReactionBody body) {
        return service.react(GameController.userId(jwt), quest, index, body.reaction());
    }

    @PutMapping("/bookmarks/{item}")
    public Snapshot bookmark(@AuthenticationPrincipal Jwt jwt, @PathVariable String item,
                             @Valid @RequestBody BookmarkBody body) {
        return service.bookmark(GameController.userId(jwt), item, body.saved());
    }
}
