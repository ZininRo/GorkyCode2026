package com.gorkycode2026.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gorkycode2026.backend.auth.web.ApiErrorWriter;
import com.gorkycode2026.backend.auth.web.AuthRateLimitFilter;
import com.gorkycode2026.backend.auth.web.OriginVerificationFilter;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        // Argon2id. Spring Security uses Bouncy Castle (already present in pom.xml).
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.auth.allowed-origins}") String originsCsv) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.stream(originsCsv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        cors.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Content-Type", "Authorization"));
        cors.setAllowCredentials(true);
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
            ObjectMapper mapper,
            @Value("${app.auth.allowed-origins}") String originsCsv) throws Exception {
        // Access uses Bearer JWT, not a CSRF-sensitive cookie. Refresh/logout cookies
        // are protected by mandatory strict Origin checking + SameSite=Lax below.
        OriginVerificationFilter originFilter = new OriginVerificationFilter(originsCsv, mapper);
        AuthRateLimitFilter rateFilter = new AuthRateLimitFilter(mapper);
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/ping", "/actuator/health", "/actuator/health/**", "/actuator/info",
                                "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login",
                                "/api/v1/auth/refresh", "/api/v1/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/me").authenticated()
                        .anyRequest().denyAll())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((req, res, ex) ->
                                ApiErrorWriter.write(res, mapper, 401, "UNAUTHORIZED", "Требуется авторизация"))
                        .accessDeniedHandler((req, res, ex) ->
                                ApiErrorWriter.write(res, mapper, 403, "FORBIDDEN", "Доступ запрещён")))
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint((req, res, ex) ->
                                ApiErrorWriter.write(res, mapper, 401, "UNAUTHORIZED", "Требуется авторизация")))
                .addFilterBefore(originFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
