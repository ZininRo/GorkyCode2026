package com.gorkycode2026.backend.events.api;

import com.gorkycode2026.backend.events.dto.DiscoveryDtos.DiscoveryItemDto;
import com.gorkycode2026.backend.events.dto.DiscoveryDtos.DiscoveryResponse;
import com.gorkycode2026.backend.events.service.DiscoveryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public discovery feed. {@code /events} is the path from DEVELOPMENT_RULES, {@code /discovery}
 * the path from the MVP spec; both return the same body. Owner: Юля.
 */
@RestController
@RequestMapping("/api/v1")
public class DiscoveryController {
    private final DiscoveryService service;

    public DiscoveryController(DiscoveryService service) {
        this.service = service;
    }

    @GetMapping({"/events", "/discovery"})
    public DiscoveryResponse list(@RequestParam(value = "category", required = false, defaultValue = "all")
                                  String category) {
        return service.list(category);
    }
    @GetMapping("/events/{id}")
    public DiscoveryItemDto detail(@PathVariable String id) {
        return service.detail(id);
    }
}
