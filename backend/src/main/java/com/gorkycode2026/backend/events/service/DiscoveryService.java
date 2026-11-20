package com.gorkycode2026.backend.events.service;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.events.dto.DiscoveryDtos.DiscoveryItemDto;
import com.gorkycode2026.backend.events.dto.DiscoveryDtos.DiscoveryResponse;
import com.gorkycode2026.backend.events.dto.DiscoveryDtos.Text;
import com.gorkycode2026.backend.events.repository.DiscoveryRepository;
import com.gorkycode2026.backend.events.repository.DiscoveryRepository.DiscoveryRow;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Discovery feed (афиша). Demo catalogue, no dates or ticket promises. Owner: Юля. */
@Service
public class DiscoveryService {
    public static final Set<String> CATEGORIES = Set.of("PLACES", "EVENTS", "FESTIVALS", "CONCERTS", "TOURS", "EXCURSIONS", "ENTERTAINMENT");

    private final DiscoveryRepository repository;

    public DiscoveryService(DiscoveryRepository repository) {
        this.repository = repository;
    }

    public DiscoveryResponse list(String category) {
        String normalized = category == null || category.isBlank() ? "ALL" : category.trim().toUpperCase(Locale.ROOT);
        List<DiscoveryRow> rows;
        if ("ALL".equals(normalized)) {
            rows = repository.findAll();
        } else if (CATEGORIES.contains(normalized)) {
            rows = repository.findByCategory(normalized);
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "category: all | places | events | festivals | concerts | tours | excursions | entertainment");
        }
        return new DiscoveryResponse(rows.stream().map(DiscoveryService::toDto).toList());
    }

    public DiscoveryItemDto detail(String id) {
        return repository.findById(id).map(DiscoveryService::toDto)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "Карточка не найдена"));
    }

    private static DiscoveryItemDto toDto(DiscoveryRow row) {
        return new DiscoveryItemDto(row.id(), row.category(), new Text(row.titleRu(), row.titleEn()),
                new Text(row.descriptionRu(), row.descriptionEn()), row.imageUrl(), row.externalUrl(), row.demo(), row.source());
    }
}
