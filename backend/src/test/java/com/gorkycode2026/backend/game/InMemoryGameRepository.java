package com.gorkycode2026.backend.game;

import com.gorkycode2026.backend.game.repository.GameRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/** In-memory replacement of GameRepository with the same seed as V4 migration. Test-only. */
public class InMemoryGameRepository extends GameRepository {
    public final List<RouteRow> routes = new ArrayList<>();
    public final List<CheckpointRow> checkpoints = new ArrayList<>();
    public final List<Object[]> collections = new ArrayList<>(); // {UUID, checkpointId, points, Instant}
    public final Set<UUID> users;

    public InMemoryGameRepository(Set<UUID> users) {
        super(null);
        this.users = users;
        routes.add(new RouteRow("main", "Главные символы", "Main symbols", "d", "d", 0));
        routes.add(new RouteRow("hidden", "За пределами открыток", "Beyond the postcards", "d", "d", 60));
        checkpoints.add(cp("cp_y01", "main", "YELLOW", 10, 56.32370, 44.00200));
        checkpoints.add(cp("cp_y02", "main", "YELLOW", 10, 56.32680, 44.00740));
        checkpoints.add(cp("cp_g01", "main", "GREEN", 30, 56.32930, 44.00460));
        checkpoints.add(cp("cp_y03", "main", "YELLOW", 10, 56.33050, 44.00800));
        checkpoints.add(cp("cp_g02", "hidden", "GREEN", 30, 56.32940, 43.99380));
        checkpoints.add(cp("cp_y04", "hidden", "YELLOW", 10, 56.32700, 43.99900));
    }

    private static CheckpointRow cp(String id, String route, String type, int points, double lat, double lng) {
        boolean green = "GREEN".equals(type);
        return new CheckpointRow(id, route, type, points, lat, lng, id + " ru", id + " en", "hint ru", "hint en",
                green ? "place ru" : null, green ? "place en" : null, green ? "desc ru" : null,
                green ? "desc en" : null, green ? "/demo/x.svg" : null);
    }

    public CheckpointRow checkpoint(String id) {
        return checkpoints.stream().filter(c -> c.id().equals(id)).findFirst().orElseThrow();
    }

    @Override public List<RouteRow> findRoutes() { return List.copyOf(routes); }
    @Override public List<CheckpointRow> findCheckpoints() { return List.copyOf(checkpoints); }
    @Override
    public Map<String, Integer> countCheckpointsByRoute() {
        return checkpoints.stream().collect(Collectors.toMap(CheckpointRow::routeId, cp -> 1, Integer::sum));
    }

    @Override
    public Map<String, CollectionStats> collectionStatsByRoute(UUID userId) {
        return findCollections(userId).stream().collect(Collectors.toMap(
                row -> checkpoint(row.checkpointId()).routeId(),
                row -> new CollectionStats(1, row.pointsAwarded()),
                (left, right) -> new CollectionStats(left.count() + right.count(), left.score() + right.score())));
    }

    @Override
    public List<MapCheckpointRow> findMapCheckpoints(double west, double south, double east, double north,
                                                    String routeId, int limit) {
        return checkpoints.stream().filter(cp -> cp.lng() >= west && cp.lng() <= east
                && cp.lat() >= south && cp.lat() <= north && (routeId == null || cp.routeId().equals(routeId)))
                .limit(limit)
                .map(cp -> new MapCheckpointRow(cp.id(), cp.routeId(), cp.type(), cp.points(), cp.lat(), cp.lng(),
                        cp.titleRu(), cp.titleEn(), findRoute(cp.routeId()).orElseThrow().requiredScore()))
                .toList();
    }

    @Override
    public Optional<MapDescription> findMapDescription(String id) {
        return findCheckpoint(id).map(cp -> new MapDescription("Описание", "Preview"));
    }

    @Override public Optional<CheckpointRow> findCheckpoint(String id) {
        return checkpoints.stream().filter(c -> c.id().equals(id)).findFirst();
    }
    @Override public List<CollectionRow> findCollections(UUID userId) {
        return collections.stream().filter(r -> r[0].equals(userId))
                .map(r -> new CollectionRow((String) r[1], (Integer) r[2], (Instant) r[3])).toList();
    }
    @Override public QuestStats questStats(UUID userId) { return new QuestStats(0, 0, 0); }

    @Override public int totalScore(UUID userId) {
        return findCollections(userId).stream().mapToInt(CollectionRow::pointsAwarded).sum();
    }
    @Override public boolean userExists(UUID userId) { return users.contains(userId); }
    @Override public void lockUser(UUID userId) { }
    @Override public boolean insertCollection(UUID userId, String checkpointId, int points) {
        boolean exists = collections.stream().anyMatch(r -> r[0].equals(userId) && r[1].equals(checkpointId));
        if (exists) return false;
        collections.add(new Object[] {userId, checkpointId, points, Instant.now()});
        return true;
    }
}
