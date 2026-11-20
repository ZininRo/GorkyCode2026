package com.gorkycode2026.backend.game.repository;

import com.gorkycode2026.backend.game.dto.GameDtos.LocalizedText;
import com.gorkycode2026.backend.game.dto.QuestDtos.Reaction;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class QuestRepository {
    private final JdbcTemplate jdbc;

    public QuestRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Template(String id, LocalizedText title, LocalizedText description, LocalizedText thread,
                           String startPlaceId, String finalPlaceId, int requiredScore) { }
    public record Place(String id, LocalizedText title, LocalizedText fact, double lat, double lng, int rank,
                        String imageUrl) { }
    public record Run(UUID id, String templateId, LocalizedText title, Instant startedAt, Instant updatedAt,
                      Instant completedAt, int visited, int total, int points, Integer pendingReactionPosition) { }
    public record Step(int position, LocalizedText title, double lat, double lng, LocalizedText clue,
                       LocalizedText fact, String imageUrl, int points, Instant visitedAt, Reaction reaction) { }

    private static final String RUNS = """
            SELECT r.id, r.template_id, t.title_ru, t.title_en, r.started_at, r.updated_at, r.completed_at,
                   counts.visited, counts.total, counts.points, counts.pending
            FROM quest_runs r JOIN quest_templates t ON t.id = r.template_id
            CROSS JOIN LATERAL (
                SELECT count(*) FILTER (WHERE visited_at IS NOT NULL) AS visited, count(*) AS total,
                       coalesce(sum(points) FILTER (WHERE visited_at IS NOT NULL), 0) AS points,
                       min(position) FILTER (WHERE visited_at IS NOT NULL AND reaction IS NULL) AS pending
                FROM quest_run_steps WHERE run_id = r.id
            ) counts
            WHERE r.user_id = ?
            """;

    private static final RowMapper<Run> RUN_MAPPER = (rs, n) -> new Run(rs.getObject("id", UUID.class),
            rs.getString("template_id"), localized(rs, "title"),
            instant(rs, "started_at"), instant(rs, "updated_at"), instant(rs, "completed_at"),
            rs.getInt("visited"), rs.getInt("total"), rs.getInt("points"), rs.getObject("pending", Integer.class));

    public List<Template> templates() {
        return jdbc.query("SELECT * FROM quest_templates ORDER BY sort_order, id", (rs, n) -> new Template(
                rs.getString("id"), localized(rs, "title"), localized(rs, "description"), localized(rs, "thread"),
                rs.getString("start_place_id"), rs.getString("final_place_id"), rs.getInt("required_score")));
    }

    public Optional<Place> place(String id) {
        return jdbc.query("SELECT * FROM quest_places WHERE id = ?", QuestRepository::placeRow, id).stream().findFirst();
    }

    public List<Place> placesInBounds(double south, double north, double west, double east) {
        return jdbc.query("""
                SELECT * FROM quest_places WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
                ORDER BY id
                """, QuestRepository::placeRow, south, north, west, east);
    }

    public List<Run> runs(UUID userId) {
        return jdbc.query(RUNS + " ORDER BY r.updated_at DESC, r.id", RUN_MAPPER, userId);
    }

    public Optional<Run> run(UUID userId, UUID id) {
        return jdbc.query(RUNS + " AND r.id = ?", RUN_MAPPER, userId, id).stream().findFirst();
    }

    public List<Step> steps(UUID runId) {
        return jdbc.query("SELECT * FROM quest_run_steps WHERE run_id = ? ORDER BY position", (rs, n) -> {
            String reaction = rs.getString("reaction");
            return new Step(rs.getInt("position"), localized(rs, "title"), rs.getDouble("lat"), rs.getDouble("lng"),
                    localized(rs, "clue"), localized(rs, "fact"), rs.getString("image_url"), rs.getInt("points"),
                    instant(rs, "visited_at"), reaction == null ? null : Reaction.valueOf(reaction));
        }, runId);
    }

    public void insertRun(UUID id, UUID userId, String templateId, String generator) {
        jdbc.update("INSERT INTO quest_runs (id, user_id, template_id, generator) VALUES (?, ?, ?, ?)",
                id, userId, templateId, generator);
    }

    public void insertStep(UUID runId, int position, Place place, LocalizedText clue, LocalizedText fact, int points) {
        jdbc.update("""
                INSERT INTO quest_run_steps (run_id, position, place_id, title_ru, title_en, lat, lng,
                                             clue_ru, clue_en, fact_ru, fact_en, image_url, points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, runId, position, place.id(), place.title().ru(), place.title().en(), place.lat(), place.lng(),
                clue.ru(), clue.en(), fact.ru(), fact.en(), place.imageUrl(), points);
    }

    public void visit(UUID runId, int position, boolean finalStep) {
        jdbc.update("UPDATE quest_run_steps SET visited_at = now() WHERE run_id = ? AND position = ?", runId, position);
        jdbc.update("""
                UPDATE quest_runs SET updated_at = now(),
                    completed_at = CASE WHEN ? THEN now() ELSE completed_at END WHERE id = ?
                """, finalStep, runId);
    }

    public void react(UUID runId, int position, Reaction reaction) {
        jdbc.update("UPDATE quest_run_steps SET reaction = ? WHERE run_id = ? AND position = ?",
                reaction.name(), runId, position);
        jdbc.update("UPDATE quest_runs SET updated_at = now() WHERE id = ?", runId);
    }

    private static Place placeRow(ResultSet rs, int row) throws SQLException {
        return new Place(rs.getString("id"), localized(rs, "title"), localized(rs, "fact"),
                rs.getDouble("lat"), rs.getDouble("lng"), rs.getInt("rank_score"), rs.getString("image_url"));
    }

    private static LocalizedText localized(ResultSet rs, String prefix) throws SQLException {
        return new LocalizedText(rs.getString(prefix + "_ru"), rs.getString(prefix + "_en"));
    }

    private static Instant instant(ResultSet rs, String name) throws SQLException {
        Timestamp value = rs.getTimestamp(name);
        return value == null ? null : value.toInstant();
    }
}
