package com.gorkycode2026.backend.game.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

/** Public JSON contract of the game module (see docs/API_CONTRACT_MVP.md). Owner: Юля. */
public final class GameDtos {
    private GameDtos() { }

    public record LocalizedText(String ru, String en) {
        public static LocalizedText of(String ru, String en) {
            return ru == null && en == null ? null : new LocalizedText(ru, en);
        }
    }

    public record ProgressDto(int score, String level, LocalizedText levelTitle, Integer nextLevelScore,
                              int collectedCount, int totalCheckpoints, int unlockedRoutesCount) { }

    public record RouteDto(String id, LocalizedText title, LocalizedText description, int requiredScore,
                           boolean unlocked, int checkpointCount, int collectedCount) { }

    /** {@code score} = points awarded for this checkpoint (10 for YELLOW, 30 for GREEN). */
    public record CheckpointDto(String id, String routeId, String type, double lat, double lng, int score,
                                boolean collected, Instant collectedAt, LocalizedText title,
                                LocalizedText hint, PlaceCardDto placeCard) { }

    public enum CheckpointStatus { AVAILABLE, COMPLETED, LOCKED }

    public record MapCheckpointDto(String id, String routeId, String type, double lat, double lng, int score,
                                   LocalizedText title, CheckpointStatus status) { }

    public record MapCheckpointsDto(List<MapCheckpointDto> items, boolean truncated) { }

    public record CheckpointDetailDto(MapCheckpointDto checkpoint, LocalizedText description, String imageUrl,
                                      LocalizedText hint, PlaceCardDto placeCard) { }

    public record PlaceCardDto(LocalizedText title, LocalizedText description, String imageUrl) { }

    public record GameStateDto(ProgressDto progress, List<RouteDto> routes, List<CheckpointDto> checkpoints,
                               boolean demoMode, int collectRadiusMeters, int maxGpsAccuracyMeters) { }

    public record CollectRequest(
            @NotNull(message = "Нужна широта") @DecimalMin("-90") @DecimalMax("90") Double lat,
            @NotNull(message = "Нужна долгота") @DecimalMin("-180") @DecimalMax("180") Double lng,
            @NotNull(message = "Нужна точность GPS") @DecimalMin("0") @DecimalMax("100000") Double accuracyMeters) { }

    public record CollectResponse(String checkpointId, boolean alreadyCollected, int pointsAwarded,
                                  LocalizedText hint, PlaceCardDto placeCard, ProgressDto progress,
                                  List<String> newlyUnlockedRoutes, Integer distanceMeters) { }
}
