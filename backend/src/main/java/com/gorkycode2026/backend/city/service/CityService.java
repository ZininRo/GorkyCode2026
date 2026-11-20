package com.gorkycode2026.backend.city.service;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.city.dto.CityResponse;
import com.gorkycode2026.backend.city.dto.CitySearchResponse;
import com.gorkycode2026.backend.city.model.City;
import com.gorkycode2026.backend.city.repository.CityRepository;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CityService {
    private static final int MAX_LIMIT = 50;
    private static final int MAX_QUERY_LENGTH = 60;

    private final CityRepository cities;

    public CityService(CityRepository cities) {
        this.cities = cities;
    }

    @Transactional(readOnly = true)
    public CitySearchResponse search(String rawQuery, int requestedLimit) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CITY_QUERY",
                    "Поисковый запрос города слишком длинный");
        }
        int limit = Math.max(1, Math.min(requestedLimit, MAX_LIMIT));
        List<CityResponse> items = cities.searchByNamePrefix(query, PageRequest.of(0, limit))
                .stream()
                .map(CityResponse::from)
                .toList();
        return new CitySearchResponse(items);
    }

    @Transactional(readOnly = true)
    public City getRequired(Long cityId) {
        if (cityId == null) {
            throw cityNotFound();
        }
        return cities.findById(cityId).orElseThrow(CityService::cityNotFound);
    }

    private static ApiException cityNotFound() {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CITY_NOT_FOUND",
                "Выбранный город не найден");
    }
}
