package com.gorkycode2026.backend.game.service;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.game.dto.GameDtos.CollectRequest;
import com.gorkycode2026.backend.game.repository.GameRepository;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Server persistence for the fixed guided screens in frontend/src/mvp. */
@Service
public class GuidedService {
    public record Visit(Instant at, String reaction) { }
    public record Snapshot(String active, Map<String, List<Visit>> routes, List<String> saved,
                           boolean demo, Map<String, double[]> coordinates) { }
    private record Point(String id, double lat, double lng) { }

    private static final Map<String, Point> PLACES = Map.of(
            "kremlin", new Point("kremlin", 56.32694, 44.00582),
            "stairs", new Point("stairs", 56.33047, 44.00944),
            "street", new Point("street", 56.32872, 43.98975),
            "strelka", new Point("strelka", 56.33451, 43.97702),
            "cathedral", new Point("cathedral", 56.33340, 43.97203),
            "stadium", new Point("stadium", 56.33639, 43.96660));
    private static final Map<String, List<String>> ROUTES = Map.of(
            "ghosts", List.of("kremlin", "stairs", "street", "strelka"),
            "spit", List.of("cathedral", "strelka", "stadium"),
            "merchants", List.of("street", "kremlin", "stairs"));
    private static final List<String> REACTIONS = List.of("love", "interesting", "okay", "more");
    private static final List<String> EVENTS = List.of("music", "evening", "festival", "tour");

    private final JdbcTemplate jdbc;
    private final GameRepository gameRepository;
    private final GameService game;

    public GuidedService(JdbcTemplate jdbc, GameRepository gameRepository, GameService game) {
        this.jdbc = jdbc;
        this.gameRepository = gameRepository;
        this.game = game;
    }

    @Transactional(readOnly = true)
    public Snapshot state(UUID userId) {
        game.requireUser(userId);
        Map<String, List<Visit>> routes = new LinkedHashMap<>();
        for (String quest : jdbc.queryForList("SELECT quest_id FROM guided_routes WHERE user_id = ? ORDER BY started_at, quest_id", String.class, userId)) {
            routes.put(quest, visits(userId, quest));
        }
        List<String> saved = jdbc.queryForList("SELECT item_id FROM guided_bookmarks WHERE user_id = ? ORDER BY item_id", String.class, userId);
        String active = null;
        for (String quest : routes.keySet()) {
            if (routes.get(quest).stream().filter(v -> v.reaction() != null).count() < ROUTES.get(quest).size()) {
                active = quest;
            }
        }
        Map<String, double[]> coordinates = new LinkedHashMap<>();
        PLACES.forEach((id, point) -> coordinates.put(id, new double[] {point.lat(), point.lng()}));
        return new Snapshot(active, routes, saved, false, coordinates);
    }

    @Transactional
    public Snapshot start(UUID userId, String quest) {
        steps(quest);
        gameRepository.lockUser(userId);
        if ("merchants".equals(quest) && score(userId) < 60) {
            throw new ApiException(HttpStatus.FORBIDDEN, "QUEST_LOCKED", "Квест откроется после повышения уровня");
        }
        jdbc.update("INSERT INTO guided_routes(user_id, quest_id) VALUES (?, ?) ON CONFLICT DO NOTHING", userId, quest);
        return state(userId);
    }

    @Transactional
    public Snapshot collect(UUID userId, String quest, int index, CollectRequest position) {
        List<String> stops = steps(quest);
        gameRepository.lockUser(userId);
        requireStarted(userId, quest);
        if (index < 0 || index >= stops.size()) throw conflict("STEP_NOT_AVAILABLE", "Эта точка пока недоступна");
        List<Visit> visited = visits(userId, quest);
        if (index < visited.size()) return state(userId);
        if (index != visited.size() || (!visited.isEmpty() && visited.get(visited.size() - 1).reaction() == null)) {
            throw conflict("STEP_NOT_AVAILABLE", "Сначала оцените предыдущую точку");
        }
        Point point = PLACES.get(stops.get(index));
        game.validateLocation(point.lat(), point.lng(), position);
        jdbc.update("INSERT INTO guided_visits(user_id, quest_id, position) VALUES (?, ?, ?)", userId, quest, index);
        return state(userId);
    }

    @Transactional
    public Snapshot react(UUID userId, String quest, int index, String reaction) {
        steps(quest);
        if (!REACTIONS.contains(reaction)) throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Неизвестная реакция");
        gameRepository.lockUser(userId);
        requireStarted(userId, quest);
        List<Visit> visited = visits(userId, quest);
        if (index < 0 || index >= visited.size()) throw conflict("STEP_NOT_VISITED", "Сначала посетите это место");
        String previous = visited.get(index).reaction();
        if (previous != null && !previous.equals(reaction)) throw conflict("REACTION_ALREADY_SAVED", "Реакция уже сохранена");
        if (previous == null) jdbc.update("UPDATE guided_visits SET reaction = ? WHERE user_id = ? AND quest_id = ? AND position = ?", reaction, userId, quest, index);
        return state(userId);
    }

    @Transactional
    public Snapshot bookmark(UUID userId, String item, boolean saved) {
        boolean known = item.startsWith("place-") && PLACES.containsKey(item.substring(6))
                || item.startsWith("event-") && EVENTS.contains(item.substring(6));
        if (!known) throw new ApiException(HttpStatus.NOT_FOUND, "ITEM_NOT_FOUND", "Карточка не найдена");
        gameRepository.lockUser(userId);
        if (saved) jdbc.update("INSERT INTO guided_bookmarks(user_id, item_id) VALUES (?, ?) ON CONFLICT DO NOTHING", userId, item);
        else jdbc.update("DELETE FROM guided_bookmarks WHERE user_id = ? AND item_id = ?", userId, item);
        return state(userId);
    }

    private List<Visit> visits(UUID userId, String quest) {
        return jdbc.query("SELECT visited_at, reaction FROM guided_visits WHERE user_id = ? AND quest_id = ? ORDER BY position",
                (rs, row) -> new Visit(rs.getTimestamp(1).toInstant(), rs.getString(2)), userId, quest);
    }

    private int score(UUID userId) {
        Integer score = jdbc.queryForObject("SELECT count(*) * 20 FROM guided_visits WHERE user_id = ? AND reaction IS NOT NULL", Integer.class, userId);
        return score == null ? 0 : score;
    }

    private void requireStarted(UUID userId, String quest) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM guided_routes WHERE user_id = ? AND quest_id = ?", Integer.class, userId, quest);
        if (count == null || count == 0) throw new ApiException(HttpStatus.NOT_FOUND, "QUEST_RUN_NOT_FOUND", "Прохождение не найдено");
    }

    private static List<String> steps(String quest) {
        List<String> stops = ROUTES.get(quest);
        if (stops == null) throw new ApiException(HttpStatus.NOT_FOUND, "QUEST_NOT_FOUND", "Квест не найден");
        return stops;
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }
}
