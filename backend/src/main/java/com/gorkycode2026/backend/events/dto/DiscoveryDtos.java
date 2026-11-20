package com.gorkycode2026.backend.events.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** JSON contract for GET /api/v1/events (alias /api/v1/discovery). Owner: Юля. */
public final class DiscoveryDtos {
    private DiscoveryDtos() { }

    public record Text(String ru, String en) { }

    public record DiscoveryItemDto(String id, String category, Text title, Text description, String imageUrl,
                                   String externalUrl, @JsonProperty("isDemo") boolean isDemo, String source) { }

    public record DiscoveryResponse(List<DiscoveryItemDto> items) { }
}
