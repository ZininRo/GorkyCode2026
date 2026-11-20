package com.gorkycode2026.backend.events.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/** JDBC access to discovery_items (V4 migration). Owner: Юля. */
@Repository
public class DiscoveryRepository {
    private static final String COLUMNS =
            "id, category, title_ru, title_en, description_ru, description_en, image_url, external_url, is_demo, source_system";
    private static final RowMapper<DiscoveryRow> MAPPER = (rs, n) -> new DiscoveryRow(rs.getString(1),
            rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getString(7),
            rs.getString(8), rs.getBoolean(9), rs.getString(10));

    private final JdbcTemplate jdbc;

    public DiscoveryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record DiscoveryRow(String id, String category, String titleRu, String titleEn, String descriptionRu,
                               String descriptionEn, String imageUrl, String externalUrl, boolean demo, String source) { }

    public Optional<DiscoveryRow> findById(String id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM discovery_items WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public List<DiscoveryRow> findAll() {
        return jdbc.query("SELECT " + COLUMNS + " FROM discovery_items ORDER BY sort_order, id", MAPPER);
    }

    public List<DiscoveryRow> findByCategory(String category) {
        return jdbc.query("SELECT " + COLUMNS + " FROM discovery_items WHERE category = ? ORDER BY sort_order, id",
                MAPPER, category);
    }
}
