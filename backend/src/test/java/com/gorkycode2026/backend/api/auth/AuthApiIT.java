package com.gorkycode2026.backend.api.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthApiIT {
    private static final String ORIGIN = "http://localhost:5173";

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17")
            .withDatabaseName("gorkycode2026_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("app.auth.jwt-secret", () -> Base64.getEncoder().encodeToString(
                "non-production-integration-test-key!".getBytes(StandardCharsets.UTF_8)));
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @Test
    void registerLoginRefreshRotateAndLogout() throws Exception {
        String email = "test-" + UUID.randomUUID() + "@example.com";
        String registration = "{\"displayName\":\"Roman\",\"email\":\"" + email +
                "\",\"password\":\"StrongPass123!\"}";

        MvcResult registered = mvc.perform(post("/api/v1/auth/register")
                        .header("Origin", ORIGIN).contentType(MediaType.APPLICATION_JSON)
                        .content(registration))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.email").value(email))
                .andReturn();
        JsonNode registeredJson = mapper.readTree(registered.getResponse().getContentAsString());
        String access = registeredJson.get("accessToken").asText();
        Cookie firstCookie = refreshCookie(registered);
        assertNotNull(firstCookie);

        mvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(jsonPath("$.email").value(email));

        mvc.perform(post("/api/v1/auth/register").header("Origin", ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON).content(registration))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"));

        mvc.perform(post("/api/v1/auth/login").header("Origin", ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));

        mvc.perform(post("/api/v1/auth/login").header("Origin", ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"StrongPass123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value(email));

        mvc.perform(post("/api/v1/auth/refresh").cookie(firstCookie))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN_ORIGIN"));

        MvcResult refreshed = mvc.perform(post("/api/v1/auth/refresh")
                        .header("Origin", ORIGIN).cookie(firstCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn();
        Cookie secondCookie = refreshCookie(refreshed);
        assertNotNull(secondCookie);
        assertFalse(firstCookie.getValue().equals(secondCookie.getValue()));

        mvc.perform(post("/api/v1/auth/refresh").header("Origin", ORIGIN).cookie(firstCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));
        mvc.perform(post("/api/v1/auth/logout").header("Origin", ORIGIN).cookie(secondCookie))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/refresh").header("Origin", ORIGIN).cookie(secondCookie))
                .andExpect(status().isUnauthorized());
    }

    private Cookie refreshCookie(MvcResult result) {
        String value = result.getResponse().getHeader("Set-Cookie");
        assertNotNull(value);
        String raw = value.split(";", 2)[0].split("=", 2)[1];
        return new Cookie("refresh_token", raw);
    }
}
