package com.gorkycode2026.backend.game.service;

import com.gorkycode2026.backend.game.dto.GameDtos.LocalizedText;
import com.gorkycode2026.backend.game.repository.QuestRepository.Place;
import com.gorkycode2026.backend.game.repository.QuestRepository.Template;
import java.util.List;

public interface QuestGenerator {
    GeneratedQuest generate(Template template);

    record GeneratedQuest(String source, List<GeneratedStep> steps) { }
    record GeneratedStep(Place place, LocalizedText clue, LocalizedText fact) { }
}
