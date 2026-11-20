package com.gorkycode2026.backend.game.dto;

import com.gorkycode2026.backend.game.dto.GameDtos.LocalizedText;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class QuestDtos {
    private QuestDtos() { }

    public enum QuestStatus { AVAILABLE, LOCKED, IN_PROGRESS, COMPLETED }
    public enum Phase { WALK, REACTION, FINISHED }
    public enum Reaction { LOVE, INTERESTING, OKAY, WANT_MORE }

    public record Catalog(List<QuestCard> items, UUID resumeRunId, int score) { }

    public record QuestCard(String id, LocalizedText title, LocalizedText description,
                            QuestStatus status, int requiredScore, UUID runId, int visitedCount, Integer totalSteps) { }

    public record History(List<RunSummary> items, UUID resumeRunId, long completedCount) { }

    public record RunSummary(UUID id, String questId, LocalizedText title, QuestStatus status, Phase phase,
                             int visitedCount, int totalSteps, int pointsEarned,
                             Instant startedAt, Instant updatedAt, Instant completedAt) { }

    public record CurrentStep(int position, LocalizedText title, double lat, double lng, LocalizedText clue) { }

    public record VisitedStep(int position, LocalizedText title, double lat, double lng, LocalizedText fact,
                              String imageUrl, int points, Instant visitedAt, Reaction reaction) { }

    public record RunView(RunSummary run, CurrentStep currentStep, List<VisitedStep> visitedSteps,
                          Integer pendingReactionPosition, int collectRadiusMeters, int maxGpsAccuracyMeters) { }

    public record ClaimResult(int pointsAwarded, boolean alreadyVisited, RunView state) { }
    public record ReactionRequest(@NotNull Reaction reaction) { }
}
