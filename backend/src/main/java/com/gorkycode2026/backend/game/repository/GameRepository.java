package com.gorkycode2026.backend.game.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Plain JDBC access to game tables (V4 migration). JDBC is used on purpose: the shared
 * {@code ddl-auto: validate} only checks JPA entities, so the game module cannot break
 * startup of the existing registration code. Owner: Юля.
 */
@Repository
public class GameRepository {
    private final JdbcTemplate jdbc;

    public GameRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record RouteRow(String id, String titleRu, String titleEn, String descriptionRu, String descriptionEn,
                           int requiredScore) { }

    public record CheckpointRow(String id, String routeId, String type, int points, double lat, double lng,
                                String titleRu, String titleEn, String hintRu, String hintEn,
                                String placeTitleRu, String placeTitleEn,
                                String placeDescriptionRu, String placeDescriptionEn, String placeImageUrl) { }

    public record MapCheckpointRow(String id, String routeId, String type, int points, double lat, double lng,
                                   String titleRu, String titleEn, int requiredScore) { }

    public record CollectionStats(int count, int score) { }

    public record CollectionRow(String checkpointId, int pointsAwarded, Instant collectedAt) { }

    private static final String CHECKPOINT_COLUMNS = """
            id, route_id, type, points, lat, lng, title_ru, title_en, hint_ru, hint_en,
            place_title_ru, place_title_en, place_description_ru, place_description_en, place_image_url
            """;

    public List<RouteRow> findRoutes() {
        return jdbc.query("""
                SELECT id, title_ru, title_en, description_ru, description_en, required_score
                FROM game_routes ORDER BY sort_order, id
                """, (rs, n) -> new RouteRow(rs.getString(1), rs.getString(2), rs.getString(3),
                rs.getString(4), rs.getString(5), rs.getInt(6)));
    }

    public List<CheckpointRow> findCheckpoints() {
        return jdbc.query("SELECT " + CHECKPOINT_COLUMNS + " FROM game_checkpoints ORDER BY sort_order, id",
                GameRepository::mapCheckpoint);
    }

    public Map<String, Integer> countCheckpointsByRoute() {
        return jdbc.query("SELECT route_id, count(*) FROM game_checkpoints GROUP BY route_id", rs -> {
            Map<String, Integer> counts = new HashMap<>();
            while (rs.next()) {
                counts.put(rs.getString(1), rs.getInt(2));
            }
            return counts;
        });
    }

    public Map<String, CollectionStats> collectionStatsByRoute(UUID userId) {
        return jdbc.query("""
                SELECT c.route_id, count(*), sum(g.points_awarded) FROM game_collections g
                JOIN game_checkpoints c ON c.id = g.checkpoint_id
                WHERE g.user_id = ? GROUP BY c.route_id
                """, rs -> {
            Map<String, CollectionStats> stats = new HashMap<>();
            while (rs.next()) {
                stats.put(rs.getString(1), new CollectionStats(rs.getInt(2), rs.getInt(3)));
            }
            return stats;
        }, userId);
    }

    public List<MapCheckpointRow> findMapCheckpoints(double west, double south, double east, double north,
                                                    String routeId, int limit) {
        String sql = """
                SELECT c.id, c.route_id, c.type, c.points, c.lat, c.lng, c.title_ru, c.title_en, r.required_score
                FROM game_checkpoints c JOIN game_routes r ON r.id = c.route_id
                WHERE c.lng BETWEEN ? AND ? AND c.lat BETWEEN ? AND ?
                """;
        if (routeId == null) {
            return jdbc.query(sql + " ORDER BY c.sort_order, c.id LIMIT ?", GameRepository::mapMarker,
                    west, east, south, north, limit);
        }
        return jdbc.query(sql + " AND c.route_id = ? ORDER BY c.sort_order, c.id LIMIT ?", GameRepository::mapMarker,
                west, east, south, north, routeId, limit);
    }

    public Optional<MapDescription> findMapDescription(String id) {
        return jdbc.query("SELECT map_description_ru, map_description_en FROM game_checkpoints WHERE id = ?",
                (rs, n) -> new MapDescription(rs.getString(1), rs.getString(2)), id).stream().findFirst();
    }

    public record MapDescription(String ru, String en) { }

    public Optional<CheckpointRow> findCheckpoint(String id) {
        return jdbc.query("SELECT " + CHECKPOINT_COLUMNS + " FROM game_checkpoints WHERE id = ?",
                GameRepository::mapCheckpoint, id).stream().findFirst();
    }

    public Optional<RouteRow> findRoute(String id) {
        return findRoutes().stream().filter(route -> route.id().equals(id)).findFirst();
    }

    public List<CollectionRow> findCollections(UUID userId) {
        return jdbc.query("""
                SELECT checkpoint_id, points_awarded, collected_at
                FROM game_collections WHERE user_id = ? ORDER BY collected_at, id
                """, (rs, n) -> new CollectionRow(rs.getString(1), rs.getInt(2), toInstant(rs.getTimestamp(3))),
                userId);
    }

    public record QuestStats(int score, int visited, int total) { }

    public QuestStats questStats(UUID userId) {
        return jdbc.queryForObject("""
                SELECT coalesce(sum(s.points) FILTER (WHERE s.visited_at IS NOT NULL), 0),
                       count(*) FILTER (WHERE s.visited_at IS NOT NULL), count(*)
                FROM quest_run_steps s JOIN quest_runs r ON r.id = s.run_id WHERE r.user_id = ?
                """, (rs, n) -> new QuestStats(rs.getInt(1), rs.getInt(2), rs.getInt(3)), userId);
    }

    public int totalScore(UUID userId) {
        return jdbc.queryForObject("""
                SELECT coalesce((SELECT sum(points_awarded) FROM game_collections WHERE user_id = ?), 0)
                     + coalesce((SELECT sum(s.points) FROM quest_run_steps s JOIN quest_runs r ON r.id = s.run_id
                                 WHERE r.user_id = ? AND s.visited_at IS NOT NULL), 0)
                """, Integer.class, userId, userId);
    }

    public boolean userExists(UUID userId) {
        Boolean exists = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM users WHERE id = ?)", Boolean.class, userId);
        return Boolean.TRUE.equals(exists);
    }

    /**
     * Serializes collect operations of one user inside the current transaction, so the
     * "score before / score after" calculation and route unlocks are consistent.
     */
    public void lockUser(UUID userId) {
        long key = userId.getMostSignificantBits() ^ userId.getLeastSignificantBits();
        jdbc.query("SELECT pg_advisory_xact_lock(?)", rs -> null, key);
    }

    /** @return true if a new row was inserted; false if this checkpoint was already collected. */
    public boolean insertCollection(UUID userId, String checkpointId, int points) {
        int inserted = jdbc.update("""
                INSERT INTO game_collections (user_id, checkpoint_id, points_awarded, collected_at)
                VALUES (?, ?, ?, now())
                ON CONFLICT ON CONSTRAINT ux_game_collections_user_checkpoint DO NOTHING
                """, userId, checkpointId, points);
        return inserted == 1;
    }

    private static MapCheckpointRow mapMarker(ResultSet rs, int row) throws SQLException {
        return new MapCheckpointRow(rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4),
                rs.getDouble(5), rs.getDouble(6), rs.getString(7), rs.getString(8), rs.getInt(9));
    }

    private static CheckpointRow mapCheckpoint(ResultSet rs, int n) throws SQLException {
        return new CheckpointRow(rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4),
                rs.getDouble(5), rs.getDouble(6), rs.getString(7), rs.getString(8), rs.getString(9),
                rs.getString(10), rs.getString(11), rs.getString(12), rs.getString(13), rs.getString(14),
                rs.getString(15));
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
