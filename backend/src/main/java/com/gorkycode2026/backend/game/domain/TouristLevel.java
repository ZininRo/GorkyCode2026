package com.gorkycode2026.backend.game.domain;

/**
 * Tourist levels for the MVP. EXPERT (130+) is an after-MVP extension and is intentionally not
 * enabled: the documents fix NOVICE 0–59 and EXPLORER 60+. Owner: Юля.
 */
public enum TouristLevel {
    NOVICE(0, "Новичок", "Novice"),
    EXPLORER(60, "Исследователь", "Explorer");

    private final int minScore;
    private final String titleRu;
    private final String titleEn;

    TouristLevel(int minScore, String titleRu, String titleEn) {
        this.minScore = minScore;
        this.titleRu = titleRu;
        this.titleEn = titleEn;
    }

    public int minScore() { return minScore; }
    public String titleRu() { return titleRu; }
    public String titleEn() { return titleEn; }

    public static TouristLevel forScore(int score) {
        TouristLevel result = NOVICE;
        for (TouristLevel level : values()) {
            if (score >= level.minScore) result = level;
        }
        return result;
    }

    /** Score needed for the next level, or {@code null} when the player is at the top level. */
    public static Integer nextLevelScore(int score) {
        for (TouristLevel level : values()) {
            if (level.minScore > score) return level.minScore;
        }
        return null;
    }
}
