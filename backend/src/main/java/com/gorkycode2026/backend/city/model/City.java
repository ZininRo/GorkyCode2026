package com.gorkycode2026.backend.city.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "cities")
public class City {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "region", length = 120)
    private String region;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected City() { }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getRegion() { return region; }
    public String getCountryCode() { return countryCode; }
}
