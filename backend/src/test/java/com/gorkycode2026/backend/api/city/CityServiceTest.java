package com.gorkycode2026.backend.api.city;

import com.gorkycode2026.backend.auth.web.ApiException;
import com.gorkycode2026.backend.city.repository.CityRepository;
import com.gorkycode2026.backend.city.service.CityService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CityServiceTest {
    @Test
    void searchTrimsQueryAndCapsLimit() {
        CityRepository repository = mock(CityRepository.class);
        when(repository.searchByNamePrefix(eq("Москва"), any(Pageable.class))).thenReturn(java.util.List.of());
        CityService service = new CityService(repository);

        service.search("  Москва  ", 500);

        verify(repository).searchByNamePrefix(eq("Москва"),
                org.mockito.ArgumentMatchers.argThat(pageable -> pageable.getPageSize() == 50));
    }

    @Test
    void unknownCityReturnsUnprocessableEntity() {
        CityRepository repository = mock(CityRepository.class);
        when(repository.findById(999L)).thenReturn(Optional.empty());
        CityService service = new CityService(repository);

        ApiException ex = assertThrows(ApiException.class, () -> service.getRequired(999L));
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, ex.status());
        assertEquals("CITY_NOT_FOUND", ex.code());
    }
}
