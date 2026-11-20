package com.gorkycode2026.backend.game.service;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.game.domain.GeoDistance;
import com.gorkycode2026.backend.game.domain.TouristLevel;
import com.gorkycode2026.backend.game.dto.GameDtos.CheckpointDto;
import com.gorkycode2026.backend.game.dto.GameDtos.CheckpointDetailDto;
import com.gorkycode2026.backend.game.dto.GameDtos.CheckpointStatus;
import com.gorkycode2026.backend.game.dto.GameDtos.MapCheckpointDto;
import com.gorkycode2026.backend.game.dto.GameDtos.MapCheckpointsDto;
import com.gorkycode2026.backend.game.dto.GameDtos.CollectRequest;
import com.gorkycode2026.backend.game.dto.GameDtos.CollectResponse;
import com.gorkycode2026.backend.game.dto.GameDtos.GameStateDto;
import com.gorkycode2026.backend.game.dto.GameDtos.LocalizedText;
import com.gorkycode2026.backend.game.dto.GameDtos.PlaceCardDto;
import com.gorkycode2026.backend.game.dto.GameDtos.ProgressDto;
import com.gorkycode2026.backend.game.dto.GameDtos.RouteDto;
import com.gorkycode2026.backend.game.readapi.GameReadApi;
import com.gorkycode2026.backend.game.repository.GameRepository;
import com.gorkycode2026.backend.game.repository.GameRepository.CheckpointRow;
import com.gorkycode2026.backend.game.repository.GameRepository.CollectionRow;
import com.gorkycode2026.backend.game.repository.GameRepository.CollectionStats;
import com.gorkycode2026.backend.game.repository.GameRepository.MapCheckpointRow;
import com.gorkycode2026.backend.game.repository.GameRepository.QuestStats;
import com.gorkycode2026.backend.game.repository.GameRepository.RouteRow;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Game is the single source of truth for score, collected crystals and unlocked routes.
 * Owner: Юля.
 */
@Service
public class GameService implements GameReadApi {
    private static final int MAP_LIMIT = 250;
    private static final Logger log = LoggerFactory.getLogger(GameService.class);

    private final GameRepository repository;
    private final boolean demoMode;
    private final int collectRadiusMeters;
    private final int maxGpsAccuracyMeters;

    public GameService(GameRepository repository, Environment environment,
                       @Value("${GAME_DEMO_MODE:false}") boolean demoMode,
                       @Value("${GAME_COLLECT_RADIUS_METERS:100}") int collectRadiusMeters,
                       @Value("${GAME_MAX_GPS_ACCURACY_METERS:100}") int maxGpsAccuracyMeters) {
        this.repository = repository;
        this.demoMode = demoMode && environment.acceptsProfiles(Profiles.of("local-demo & !prod & !production"));
        this.collectRadiusMeters = collectRadiusMeters;
        this.maxGpsAccuracyMeters = maxGpsAccuracyMeters;
        if (this.demoMode) {
            log.warn("GAME_DEMO_MODE=true: the UI offers a demo 'I am here' button. Never enable it on a public server.");
        }
    }

    @Transactional(readOnly = true)
    public GameStateDto getState(UUID userId) {
        requireUser(userId);
        List<RouteRow> routes = repository.findRoutes();
        List<CheckpointRow> checkpoints = repository.findCheckpoints();
        Map<String, CollectionRow> collected = collectedById(userId);
        QuestStats stats = repository.questStats(userId);
        int score = sum(collected) + stats.score();

        List<RouteDto> routeDtos = routes.stream().map(route -> toRouteDto(route, checkpoints, collected, score)).toList();
        Map<String, Boolean> unlockedByRoute = routeDtos.stream()
                .collect(Collectors.toMap(RouteDto::id, RouteDto::unlocked));

        // Locked routes expose their title and a lock, never their active checkpoints.
        List<CheckpointDto> visible = checkpoints.stream()
                .filter(cp -> unlockedByRoute.getOrDefault(cp.routeId(), false))
                .map(cp -> toCheckpointDto(cp, collected.get(cp.id())))
                .toList();

        return new GameStateDto(progress(score, collected.size() + stats.visited(), checkpoints.size() + stats.total(), routes),
                routeDtos, visible, demoMode, collectRadiusMeters, maxGpsAccuracyMeters);
    }

    @Transactional(readOnly = true)
    public GameStateDto getSummary(UUID userId) {
        requireUser(userId);
        List<RouteRow> routes = repository.findRoutes();
        Map<String, Integer> counts = repository.countCheckpointsByRoute();
        Map<String, CollectionStats> collected = repository.collectionStatsByRoute(userId);
        QuestStats stats = repository.questStats(userId);
        int score = collected.values().stream().mapToInt(CollectionStats::score).sum() + stats.score();
        int collectedCount = collected.values().stream().mapToInt(CollectionStats::count).sum();
        List<RouteDto> routeDtos = routes.stream()
                .map(route -> routeDto(route, score, counts.getOrDefault(route.id(), 0),
                        collected.getOrDefault(route.id(), new CollectionStats(0, 0)).count()))
                .toList();
        int total = counts.values().stream().mapToInt(Integer::intValue).sum();
        return new GameStateDto(progress(score, collectedCount + stats.visited(), total + stats.total(), routes), routeDtos, List.of(),
                demoMode, collectRadiusMeters, maxGpsAccuracyMeters);
    }

    @Transactional(readOnly = true)
    public MapCheckpointsDto getMapCheckpoints(UUID userId, double west, double south, double east, double north,
                                               String routeId) {
        requireUser(userId);
        Map<String, CollectionRow> collected = collectedById(userId);
        int score = sum(collected) + repository.questStats(userId).score();
        List<MapCheckpointRow> rows = repository.findMapCheckpoints(west, south, east, north, routeId, MAP_LIMIT + 1);
        List<MapCheckpointDto> items = rows.stream().limit(MAP_LIMIT)
                .map(cp -> mapCheckpoint(cp, collected.containsKey(cp.id()), score))
                .toList();
        return new MapCheckpointsDto(items, rows.size() > MAP_LIMIT);
    }

    @Transactional(readOnly = true)
    public CheckpointDetailDto getCheckpointDetail(UUID userId, String id) {
        requireUser(userId);
        CheckpointRow cp = repository.findCheckpoint(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "CHECKPOINT_NOT_FOUND", "Чекпоинт не найден"));
        RouteRow route = repository.findRoute(cp.routeId()).orElseThrow();
        Map<String, CollectionRow> collected = collectedById(userId);
        boolean completed = collected.containsKey(id);
        MapCheckpointRow row = new MapCheckpointRow(cp.id(), cp.routeId(), cp.type(), cp.points(), cp.lat(), cp.lng(),
                cp.titleRu(), cp.titleEn(), route.requiredScore());
        MapCheckpointDto marker = mapCheckpoint(row, completed, sum(collected) + repository.questStats(userId).score());
        LocalizedText description = repository.findMapDescription(id)
                .map(text -> LocalizedText.of(text.ru(), text.en()))
                .orElseGet(() -> new LocalizedText(route.descriptionRu(), route.descriptionEn()));
        return new CheckpointDetailDto(marker, description,
                marker.status() == CheckpointStatus.LOCKED ? null : cp.placeImageUrl(),
                completed ? LocalizedText.of(cp.hintRu(), cp.hintEn()) : null,
                completed ? placeCard(cp) : null);
    }

    @Transactional(readOnly = true)
    public ProgressDto getProgress(UUID userId) {
        requireUser(userId);
        Map<String, CollectionRow> collected = collectedById(userId);
        QuestStats stats = repository.questStats(userId);
        return progress(sum(collected) + stats.score(), collected.size() + stats.visited(),
                repository.findCheckpoints().size() + stats.total(), repository.findRoutes());
    }

    @Transactional
    public CollectResponse collect(UUID userId, String checkpointId, CollectRequest request) {
        requireUser(userId);
        CheckpointRow checkpoint = repository.findCheckpoint(checkpointId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "CHECKPOINT_NOT_FOUND", "Чекпоинт не найден"));
        RouteRow route = repository.findRoute(checkpoint.routeId()).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "CHECKPOINT_NOT_FOUND", "Чекпоинт не найден"));

        repository.lockUser(userId);
        int scoreBefore = repository.totalScore(userId);

        if (scoreBefore < route.requiredScore()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ROUTE_LOCKED",
                    "Маршрут ещё не открыт: нужно " + route.requiredScore() + " очков");
        }

        boolean alreadyCollected = repository.findCollections(userId).stream()
                .anyMatch(row -> row.checkpointId().equals(checkpointId));
        if (alreadyCollected) {
            return response(checkpoint, true, 0, userId, scoreBefore, null);
        }

        double distance = validateLocation(checkpoint.lat(), checkpoint.lng(), request);
        boolean inserted = repository.insertCollection(userId, checkpointId, checkpoint.points());
        int awarded = inserted ? checkpoint.points() : 0;
        return response(checkpoint, !inserted, awarded, userId, scoreBefore, (int) Math.round(distance));
    }

    int collectRadiusMeters() { return collectRadiusMeters; }

    int maxGpsAccuracyMeters() { return maxGpsAccuracyMeters; }

    double validateLocation(double lat, double lng, CollectRequest request) {
        if (request.accuracyMeters() > maxGpsAccuracyMeters) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "GPS_INACCURATE",
                    "Точность GPS хуже " + maxGpsAccuracyMeters + " м");
        }
        double distance = GeoDistance.meters(request.lat(), request.lng(), lat, lng);
        if (distance > collectRadiusMeters) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TOO_FAR",
                    "До чекпоинта примерно " + Math.round(distance) + " м, нужно быть ближе " + collectRadiusMeters + " м");
        }

        return distance;
    }

    private CollectResponse response(CheckpointRow checkpoint, boolean alreadyCollected, int awarded, UUID userId,
                                     int scoreBefore, Integer distance) {
        List<RouteRow> routes = repository.findRoutes();
        Map<String, CollectionRow> collected = collectedById(userId);
        QuestStats stats = repository.questStats(userId);
        int scoreAfter = sum(collected) + stats.score();
        List<String> newlyUnlocked = routes.stream()
                .filter(route -> scoreBefore < route.requiredScore() && scoreAfter >= route.requiredScore())
                .map(RouteRow::id)
                .toList();
        return new CollectResponse(checkpoint.id(), alreadyCollected, awarded,
                LocalizedText.of(checkpoint.hintRu(), checkpoint.hintEn()), placeCard(checkpoint),
                progress(scoreAfter, collected.size() + stats.visited(), repository.findCheckpoints().size() + stats.total(), routes),
                newlyUnlocked, distance);
    }

    // ------------------------------------------------------------------ GameReadApi (for ai/)

    @Override
    @Transactional(readOnly = true)
    public Optional<CheckpointFacts> findCheckpointFacts(String checkpointId) {
        return repository.findCheckpoint(checkpointId).map(cp -> new CheckpointFacts(cp.id(), cp.routeId(), cp.type(),
                cp.titleRu(), cp.titleEn(), cp.hintRu(), cp.hintEn(), cp.placeDescriptionRu(), cp.placeDescriptionEn()));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCollected(UUID userId, String checkpointId) {
        return repository.findCollections(userId).stream().anyMatch(row -> row.checkpointId().equals(checkpointId));
    }

    @Override
    @Transactional(readOnly = true)
    public PlayerSnapshot playerSnapshot(UUID userId) {
        List<CollectionRow> rows = repository.findCollections(userId);
        int score = rows.stream().mapToInt(CollectionRow::pointsAwarded).sum() + repository.questStats(userId).score();
        return new PlayerSnapshot(score, TouristLevel.forScore(score).name(),
                rows.stream().map(CollectionRow::checkpointId).toList());
    }

    // ------------------------------------------------------------------ helpers

    void requireUser(UUID userId) {
        if (!repository.userExists(userId)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Требуется авторизация");
        }
    }

    private Map<String, CollectionRow> collectedById(UUID userId) {
        return repository.findCollections(userId).stream()
                .collect(Collectors.toMap(CollectionRow::checkpointId, Function.identity(), (a, b) -> a));
    }

    private static int sum(Map<String, CollectionRow> collected) {
        return collected.values().stream().mapToInt(CollectionRow::pointsAwarded).sum();
    }

    private static ProgressDto progress(int score, int collectedCount, int totalCheckpoints, List<RouteRow> routes) {
        TouristLevel level = TouristLevel.forScore(score);
        int unlockedRoutes = (int) routes.stream().filter(route -> score >= route.requiredScore()).count();
        return new ProgressDto(score, level.name(), new LocalizedText(level.titleRu(), level.titleEn()),
                TouristLevel.nextLevelScore(score), collectedCount, totalCheckpoints, unlockedRoutes);
    }

    private static RouteDto toRouteDto(RouteRow route, List<CheckpointRow> checkpoints,
                                       Map<String, CollectionRow> collected, int score) {
        List<CheckpointRow> own = checkpoints.stream().filter(cp -> cp.routeId().equals(route.id())).toList();
        int collectedCount = (int) own.stream().filter(cp -> collected.containsKey(cp.id())).count();
        return routeDto(route, score, own.size(), collectedCount);
    }

    private static RouteDto routeDto(RouteRow route, int score, int total, int collectedCount) {
        return new RouteDto(route.id(), new LocalizedText(route.titleRu(), route.titleEn()),
                new LocalizedText(route.descriptionRu(), route.descriptionEn()), route.requiredScore(),
                score >= route.requiredScore(), total, collectedCount);
    }

    private static MapCheckpointDto mapCheckpoint(MapCheckpointRow cp, boolean completed, int score) {
        CheckpointStatus status = CheckpointStatus.LOCKED;
        if (completed) {
            status = CheckpointStatus.COMPLETED;
        } else if (score >= cp.requiredScore()) {
            status = CheckpointStatus.AVAILABLE;
        }
        return new MapCheckpointDto(cp.id(), cp.routeId(), cp.type(), cp.lat(), cp.lng(), cp.points(),
                new LocalizedText(cp.titleRu(), cp.titleEn()), status);
    }

    private static CheckpointDto toCheckpointDto(CheckpointRow cp, CollectionRow collection) {
        boolean isCollected = collection != null;
        Instant collectedAt = isCollected ? collection.collectedAt() : null;
        // Hint and place card are revealed only after a successful collect.
        return new CheckpointDto(cp.id(), cp.routeId(), cp.type(), cp.lat(), cp.lng(), cp.points(), isCollected,
                collectedAt, new LocalizedText(cp.titleRu(), cp.titleEn()),
                isCollected ? LocalizedText.of(cp.hintRu(), cp.hintEn()) : null,
                isCollected ? placeCard(cp) : null);
    }

    private static PlaceCardDto placeCard(CheckpointRow cp) {
        if (!"GREEN".equals(cp.type()) || cp.placeTitleRu() == null) return null;
        return new PlaceCardDto(new LocalizedText(cp.placeTitleRu(), cp.placeTitleEn()),
                new LocalizedText(cp.placeDescriptionRu(), cp.placeDescriptionEn()), cp.placeImageUrl());
    }
}
