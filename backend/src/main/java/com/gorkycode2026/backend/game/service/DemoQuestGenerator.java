package com.gorkycode2026.backend.game.service;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.game.domain.GeoDistance;
import com.gorkycode2026.backend.game.dto.GameDtos.LocalizedText;
import com.gorkycode2026.backend.game.repository.QuestRepository;
import com.gorkycode2026.backend.game.repository.QuestRepository.Place;
import com.gorkycode2026.backend.game.repository.QuestRepository.Template;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class DemoQuestGenerator implements QuestGenerator {
    private static final int STEP_COUNT = 4;
    private static final double BAND_HALF_WIDTH = 0.11;
    private static final double MAX_DETOUR_FACTOR = 1.30;
    private final QuestRepository repository;

    public DemoQuestGenerator(QuestRepository repository) { this.repository = repository; }

    private record Candidate(Place place, double remaining) { }

    @Override
    public GeneratedQuest generate(Template template) {
        Place start = repository.place(template.startPlaceId()).orElseThrow(DemoQuestGenerator::unavailable);
        Place finish = repository.place(template.finalPlaceId()).orElseThrow(DemoQuestGenerator::unavailable);
        double length = distance(start, finish);
        if (length < 400) throw unavailable();

        // A conservative bounding box limits the scan before exact distance calculations.
        double latMargin = length * MAX_DETOUR_FACTOR / 110_000;
        double lngMargin = latMargin / Math.max(0.1, Math.cos(Math.toRadians(finish.lat())));
        List<Candidate> candidates = repository.placesInBounds(finish.lat() - latMargin, finish.lat() + latMargin,
                        finish.lng() - lngMargin, finish.lng() + lngMargin).stream()
                .filter(place -> !place.id().equals(start.id()) && !place.id().equals(finish.id()))
                .map(place -> new Candidate(place, distance(place, finish)))
                .filter(candidate -> distance(start, candidate.place()) + candidate.remaining() <= length * MAX_DETOUR_FACTOR)
                .toList();

        List<GeneratedStep> steps = new ArrayList<>(STEP_COUNT);
        for (int index = 1; index < STEP_COUNT; index++) {
            double target = 1.0 - (double) index / STEP_COUNT;
            List<Candidate> band = candidates.stream()
                    .filter(candidate -> Math.abs(candidate.remaining() / length - target) <= BAND_HALF_WIDTH)
                    .toList();
            steps.add(step(pick(band), template.thread(), false));
        }
        steps.add(step(finish, template.thread(), true));
        return new GeneratedQuest("DEMO", List.copyOf(steps));
    }

    private static Place pick(List<Candidate> band) {
        long weight = band.stream().mapToLong(candidate -> candidate.place().rank()).sum();
        if (weight == 0) throw unavailable();
        long draw = ThreadLocalRandom.current().nextLong(weight);
        for (Candidate candidate : band) {
            draw -= candidate.place().rank();
            if (draw < 0) return candidate.place();
        }
        throw new IllegalStateException("Invalid place weights");
    }

    private static GeneratedStep step(Place place, LocalizedText thread, boolean finalStep) {
        if (finalStep) {
            return new GeneratedStep(place, new LocalizedText(
                    "НиНо: мы у финала! Найди «" + place.title().ru() + "».",
                    "Nino: we're at the final stop! Find “" + place.title().en() + "”."), place.fact());
        }
        LocalizedText clue = new LocalizedText(
                "НиНо: следующая остановка — «" + place.title().ru() + "».",
                "Nino: next stop — “" + place.title().en() + "”.");
        LocalizedText fact = new LocalizedText(place.fact().ru() + "\n\nНиНо: " + thread.ru(),
                place.fact().en() + "\n\nNino: " + thread.en());
        return new GeneratedStep(place, clue, fact);
    }

    private static double distance(Place from, Place to) {
        return GeoDistance.meters(from.lat(), from.lng(), to.lat(), to.lng());
    }

    private static ApiException unavailable() {
        return new ApiException(HttpStatus.CONFLICT, "QUEST_ROUTE_UNAVAILABLE", "Для маршрута недостаточно подходящих мест");
    }
}
