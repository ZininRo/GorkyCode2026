package com.gorkycode2026.backend.city.repository;

import com.gorkycode2026.backend.city.model.City;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CityRepository extends JpaRepository<City, Long> {
    @Query("""
            select c from City c
            where :query = '' or locate(lower(:query), lower(c.name)) > 0
            order by case when :query = '' or locate(lower(:query), lower(c.name)) = 1 then 0 else 1 end,
                     c.sortOrder asc, c.name asc
            """)
    List<City> searchByNamePrefix(@Param("query") String query, Pageable pageable);
}
