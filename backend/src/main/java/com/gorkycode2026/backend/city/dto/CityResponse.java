package com.gorkycode2026.backend.city.dto;

import com.gorkycode2026.backend.city.model.City;

public record CityResponse(Long id, String name, String region, String countryCode) {
    public static CityResponse from(City city) {
        return new CityResponse(city.getId(), city.getName(), city.getRegion(), city.getCountryCode());
    }
}
