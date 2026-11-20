-- V2 intentionally used CHAR(2), while the JPA entity maps the field as VARCHAR(2).
-- Do not edit V2 after it has been applied: normalize the schema in a new migration.
ALTER TABLE cities
    ALTER COLUMN country_code TYPE VARCHAR(2)
    USING TRIM(country_code);
