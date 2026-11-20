package com.gorkycode2026.backend.game.readapi;

import java.util.Optional;
import java.util.UUID;

/**
 * Read-only interface that the game module exposes to other modules (AI).
 * Agreed direction: ai -> game.readapi. The game module never depends on ai, and nobody
 * outside game changes progress. Owner: Юля (interface), consumer: Рома (ai/).
 */
public interface GameReadApi {

    /** Verified facts about a checkpoint from the game DB (title, hint, place description). */
    Optional<CheckpointFacts> findCheckpointFacts(String checkpointId);

    boolean isCollected(UUID userId, String checkpointId);

    PlayerSnapshot playerSnapshot(UUID userId);

    record CheckpointFacts(String id, String routeId, String type,
                           String titleRu, String titleEn, String hintRu, String hintEn,
                           String placeDescriptionRu, String placeDescriptionEn) { }

    /** level = NOVICE | EXPLORER; collectedCheckpointIds is ordered by collection time. */
    record PlayerSnapshot(int score, String level, java.util.List<String> collectedCheckpointIds) { }
}
