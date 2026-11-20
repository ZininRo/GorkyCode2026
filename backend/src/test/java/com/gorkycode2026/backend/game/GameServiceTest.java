package com.gorkycode2026.backend.game;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.game.domain.GeoDistance;
import com.gorkycode2026.backend.game.domain.TouristLevel;
import com.gorkycode2026.backend.game.dto.GameDtos.CheckpointStatus;
import com.gorkycode2026.backend.game.dto.GameDtos.CollectRequest;
import com.gorkycode2026.backend.game.dto.GameDtos.CollectResponse;
import com.gorkycode2026.backend.game.dto.GameDtos.GameStateDto;
import com.gorkycode2026.backend.game.repository.GameRepository.CheckpointRow;
import com.gorkycode2026.backend.game.service.GameService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

/** Scenarios from "ТЗ MVP, раздел 11: минимальные автопроверки API". Owner: Юля. */
class GameServiceTest {
    private final UUID user = UUID.randomUUID();
    private InMemoryGameRepository repo;
    private GameService service;

    @BeforeEach
    void setUp() {
        repo = new InMemoryGameRepository(Set.of(user));
        service = new GameService(repo, new MockEnvironment(), false, 100, 100);
    }

    private CollectRequest at(String checkpointId) {
        CheckpointRow cp = repo.checkpoint(checkpointId);
        return new CollectRequest(cp.lat() + 0.0001, cp.lng() + 0.0001, 15.0);
    }

    @Test
    void newPlayerStartsAsNoviceWithHiddenRouteLocked() {
        GameStateDto state = service.getState(user);
        assertEquals(0, state.progress().score());
        assertEquals("NOVICE", state.progress().level());
        assertEquals(60, state.progress().nextLevelScore());
        assertTrue(state.routes().stream().filter(r -> r.id().equals("main")).findFirst().orElseThrow().unlocked());
        assertFalse(state.routes().stream().filter(r -> r.id().equals("hidden")).findFirst().orElseThrow().unlocked());
        assertEquals(4, state.checkpoints().size(), "hidden checkpoints must not be exposed");
        assertTrue(state.checkpoints().stream().allMatch(cp -> cp.hint() == null), "hints only after collect");
    }

    @Test
    void tooFarDoesNotAwardPoints() {
        ApiException ex = assertThrows(ApiException.class,
                () -> service.collect(user, "cp_y01", new CollectRequest(56.30, 43.90, 10.0)));
        assertEquals("TOO_FAR", ex.code());
        assertEquals(403, ex.status().value());
        assertEquals(0, service.getProgress(user).score());
    }

    @Test
    void inaccurateGpsIsRejected() {
        CheckpointRow cp = repo.checkpoint("cp_y01");
        ApiException ex = assertThrows(ApiException.class,
                () -> service.collect(user, "cp_y01", new CollectRequest(cp.lat(), cp.lng(), 250.0)));
        assertEquals("GPS_INACCURATE", ex.code());
        assertEquals(422, ex.status().value());
    }

    @Test
    void repeatedCollectGivesZeroPoints() {
        CollectResponse first = service.collect(user, "cp_y01", at("cp_y01"));
        assertEquals(10, first.pointsAwarded());
        assertFalse(first.alreadyCollected());
        assertNull(first.placeCard(), "yellow has no place card");
        assertNotNull(first.hint());

        CollectResponse second = service.collect(user, "cp_y01", at("cp_y01"));
        assertTrue(second.alreadyCollected());
        assertEquals(0, second.pointsAwarded());
        assertEquals(10, second.progress().score());
    }

    @Test
    void hiddenCheckpointIsLockedBefore60() {
        ApiException ex = assertThrows(ApiException.class, () -> service.collect(user, "cp_g02", at("cp_g02")));
        assertEquals("ROUTE_LOCKED", ex.code());
        assertEquals(403, ex.status().value());
    }

    @Test
    void fourBaseCheckpointsGive60AndUnlockHiddenRoute() {
        assertEquals(10, service.collect(user, "cp_y01", at("cp_y01")).progress().score());
        assertEquals(20, service.collect(user, "cp_y02", at("cp_y02")).progress().score());
        CollectResponse green = service.collect(user, "cp_g01", at("cp_g01"));
        assertEquals(30, green.pointsAwarded());
        assertEquals(50, green.progress().score());
        assertNotNull(green.placeCard(), "green has a place card");
        assertTrue(green.newlyUnlockedRoutes().isEmpty());

        CollectResponse last = service.collect(user, "cp_y03", at("cp_y03"));
        assertEquals(60, last.progress().score());
        assertEquals("EXPLORER", last.progress().level());
        assertNull(last.progress().nextLevelScore());
        assertEquals(List.of("hidden"), last.newlyUnlockedRoutes());

        GameStateDto state = service.getState(user);
        assertEquals(6, state.checkpoints().size());
        assertEquals(2, state.progress().unlockedRoutesCount());
        assertEquals(90, service.collect(user, "cp_g02", at("cp_g02")).progress().score());
    }

    @Test
    void unknownCheckpointIs404AndUnknownUserIs401() {
        assertEquals("CHECKPOINT_NOT_FOUND",
                assertThrows(ApiException.class, () -> service.collect(user, "nope", at("cp_y01"))).code());
        assertEquals("UNAUTHORIZED",
                assertThrows(ApiException.class, () -> service.getState(UUID.randomUUID())).code());
    }

    @Test
    void mapFiltersAndReturnsStatusesWithoutChangingLegacyVisibility() {
        var map = service.getMapCheckpoints(user, 43.99, 56.32, 44.01, 56.34, null);
        assertEquals(6, map.items().size());
        assertEquals(2, map.items().stream().filter(cp -> cp.status() == CheckpointStatus.LOCKED).count());
        assertEquals(4, service.getState(user).checkpoints().size());
        var filtered = service.getMapCheckpoints(user, 43.99, 56.32, 43.998, 56.34, "hidden").items();
        assertEquals(List.of("cp_g02"), filtered.stream().map(cp -> cp.id()).toList());

        service.collect(user, "cp_y01", at("cp_y01"));
        var detail = service.getCheckpointDetail(user, "cp_y01");
        assertEquals(CheckpointStatus.COMPLETED, detail.checkpoint().status());
        assertEquals("Preview", detail.description().en());
        assertNotNull(detail.hint());
        var locked = service.getCheckpointDetail(user, "cp_g02");
        assertEquals(CheckpointStatus.LOCKED, locked.checkpoint().status());
        assertNull(locked.imageUrl());
        assertNull(locked.hint());
        assertNull(locked.placeCard());

        GameStateDto summary = service.getSummary(user);
        assertEquals(service.getState(user).routes(), summary.routes());
        assertEquals(service.getState(user).progress(), summary.progress());
        assertTrue(summary.checkpoints().isEmpty());
    }

    @Test
    void viewportIsCapped() {
        CheckpointRow checkpoint = repo.checkpoint("cp_y01");
        for (int i = 0; i < 251; i++) {
            repo.checkpoints.add(checkpoint);
        }
        var map = service.getMapCheckpoints(user, 43.99, 56.32, 44.01, 56.34, null);
        assertEquals(250, map.items().size());
        assertTrue(map.truncated());
    }

    @Test
    void demoNeedsLocalProfileAndStillUsesGpsValidation() {
        MockEnvironment env = new MockEnvironment();
        GameService enabled = new GameService(repo, env, true, 100, 100);
        assertFalse(enabled.getState(user).demoMode());
        env.setActiveProfiles("local-demo", "production");
        assertFalse(new GameService(repo, env, true, 100, 100).getState(user).demoMode());
        env.setActiveProfiles("local-demo");
        GameService local = new GameService(repo, env, true, 100, 100);
        assertTrue(local.getState(user).demoMode());
        assertEquals("TOO_FAR", assertThrows(ApiException.class,
                () -> local.collect(user, "cp_y01", new CollectRequest(56.30, 43.90, 5.0))).code());
    }

    @Test
    void domainHelpers() {
        // ~111 m per 0.001 deg of latitude
        double d = GeoDistance.meters(56.3270, 44.0070, 56.3280, 44.0070);
        assertTrue(d > 105 && d < 117, "distance " + d);
        assertEquals(0.0, GeoDistance.meters(56.3, 44.0, 56.3, 44.0), 1e-9);
        assertEquals(TouristLevel.NOVICE, TouristLevel.forScore(59));
        assertEquals(TouristLevel.EXPLORER, TouristLevel.forScore(60));
        assertEquals(60, TouristLevel.nextLevelScore(0));
        assertNull(TouristLevel.nextLevelScore(60));
    }
}
