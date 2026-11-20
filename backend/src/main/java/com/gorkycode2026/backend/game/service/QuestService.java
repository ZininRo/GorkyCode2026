package com.gorkycode2026.backend.game.service;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.game.dto.GameDtos.CollectRequest;
import com.gorkycode2026.backend.game.dto.QuestDtos.*;
import com.gorkycode2026.backend.game.repository.GameRepository;
import com.gorkycode2026.backend.game.repository.QuestRepository;
import com.gorkycode2026.backend.game.repository.QuestRepository.Run;
import com.gorkycode2026.backend.game.repository.QuestRepository.Step;
import com.gorkycode2026.backend.game.repository.QuestRepository.Template;
import com.gorkycode2026.backend.game.service.QuestGenerator.GeneratedStep;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuestService {
    private final QuestRepository quests;
    private final GameRepository gameRepository;
    private final GameService game;
    private final QuestGenerator generator;

    public QuestService(QuestRepository quests, GameRepository gameRepository, GameService game, QuestGenerator generator) {
        this.quests = quests;
        this.gameRepository = gameRepository;
        this.game = game;
        this.generator = generator;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Catalog catalog(UUID userId) {
        game.requireUser(userId);
        int score = gameRepository.totalScore(userId);
        List<Run> runs = quests.runs(userId);
        Map<String, Run> byTemplate = runs.stream().collect(Collectors.toMap(Run::templateId, Function.identity()));
        List<QuestCard> cards = quests.templates().stream().map(template -> {
            Run run = byTemplate.get(template.id());
            QuestStatus status = run == null
                    ? (score >= template.requiredScore() ? QuestStatus.AVAILABLE : QuestStatus.LOCKED)
                    : status(run);
            return new QuestCard(template.id(), template.title(), template.description(), status, template.requiredScore(),
                    run == null ? null : run.id(), run == null ? 0 : run.visited(), run == null ? null : run.total());
        }).toList();
        return new Catalog(cards, resume(runs), score);
    }

    @Transactional(readOnly = true)
    public History history(UUID userId) {
        game.requireUser(userId);
        List<Run> runs = quests.runs(userId);
        return new History(runs.stream().map(QuestService::summary).toList(), resume(runs),
                runs.stream().filter(run -> run.completedAt() != null).count());
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public RunView view(UUID userId, UUID runId) {
        return toView(requireRun(userId, runId));
    }

    @Transactional
    public RunView start(UUID userId, String templateId) {
        game.requireUser(userId);
        gameRepository.lockUser(userId);
        for (Run run : quests.runs(userId)) {
            if (run.templateId().equals(templateId)) return toView(run);
        }
        Template template = quests.templates().stream().filter(item -> item.id().equals(templateId)).findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "QUEST_NOT_FOUND", "Квест не найден"));
        if (gameRepository.totalScore(userId) < template.requiredScore()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "QUEST_LOCKED", "Квест откроется после повышения уровня");
        }
        var quest = generator.generate(template);
        UUID id = UUID.randomUUID();
        quests.insertRun(id, userId, templateId, quest.source());
        List<GeneratedStep> steps = quest.steps();
        for (int index = 0; index < steps.size(); index++) {
            GeneratedStep step = steps.get(index);
            int position = index + 1;
            quests.insertStep(id, position, step.place(), step.clue(), step.fact(), position == steps.size() ? 30 : 10);
        }
        return toView(requireRun(userId, id));
    }

    @Transactional
    public ClaimResult collect(UUID userId, UUID runId, int position, CollectRequest request) {
        gameRepository.lockUser(userId);
        Run run = requireRun(userId, runId);
        if (position > 0 && position <= run.visited()) {
            return new ClaimResult(0, true, toView(run));
        }
        if (run.pendingReactionPosition() != null) {
            throw conflict("REACTION_REQUIRED", "Сначала оцените посещённое место");
        }
        if (position != run.visited() + 1 || position > run.total()) {
            throw conflict("STEP_NOT_AVAILABLE", "Эта точка пока недоступна");
        }
        Step step = quests.steps(runId).get(position - 1);
        game.validateLocation(step.lat(), step.lng(), request);
        quests.visit(runId, position, position == run.total());
        return new ClaimResult(step.points(), false, toView(requireRun(userId, runId)));
    }

    @Transactional
    public RunView react(UUID userId, UUID runId, int position, Reaction reaction) {
        gameRepository.lockUser(userId);
        Run run = requireRun(userId, runId);
        if (position <= 0 || position > run.visited()) {
            throw conflict("STEP_NOT_VISITED", "Сначала посетите это место");
        }
        Step step = quests.steps(runId).get(position - 1);
        if (step.reaction() == reaction) return toView(run);
        if (step.reaction() != null) {
            throw conflict("REACTION_ALREADY_SAVED", "Реакция на это место уже сохранена");
        }
        quests.react(runId, position, reaction);
        return toView(requireRun(userId, runId));
    }

    private Run requireRun(UUID userId, UUID runId) {
        return quests.run(userId, runId).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "QUEST_RUN_NOT_FOUND", "Прохождение не найдено"));
    }

    private RunView toView(Run run) {
        List<Step> steps = quests.steps(run.id());
        List<VisitedStep> visited = steps.stream().filter(step -> step.visitedAt() != null)
                .map(step -> new VisitedStep(step.position(), step.title(), step.lat(), step.lng(), step.fact(),
                        step.imageUrl(), step.points(), step.visitedAt(), step.reaction())).toList();
        CurrentStep current = null;
        if (phase(run) == Phase.WALK) {
            Step step = steps.get(run.visited());
            current = new CurrentStep(step.position(), step.title(), step.lat(), step.lng(), step.clue());
        }
        return new RunView(summary(run), current, visited, run.pendingReactionPosition(),
                game.collectRadiusMeters(), game.maxGpsAccuracyMeters());
    }

    private static RunSummary summary(Run run) {
        return new RunSummary(run.id(), run.templateId(), run.title(), status(run), phase(run), run.visited(), run.total(),
                run.points(), run.startedAt(), run.updatedAt(), run.completedAt());
    }

    private static QuestStatus status(Run run) {
        return run.completedAt() == null ? QuestStatus.IN_PROGRESS : QuestStatus.COMPLETED;
    }

    private static Phase phase(Run run) {
        if (run.pendingReactionPosition() != null) return Phase.REACTION;
        return run.completedAt() == null ? Phase.WALK : Phase.FINISHED;
    }

    private static UUID resume(List<Run> runs) {
        return runs.stream().filter(run -> phase(run) != Phase.FINISHED).map(Run::id).findFirst().orElse(null);
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }
}
