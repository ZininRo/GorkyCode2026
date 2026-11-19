package com.gorkycode2026.backend.config;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.OctetSequenceKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.util.Base64;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;

@Configuration
public class JwtConfig {
    @Bean
    SecretKey jwtSecretKey(@Value("${app.auth.jwt-secret}") String encodedSecret) {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(encodedSecret);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("AUTH_JWT_SECRET must be Base64 encoded", ex);
        }
        if (keyBytes.length < 32) {
            throw new IllegalStateException("AUTH_JWT_SECRET must contain at least 32 random bytes");
        }
        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey key) {
        OctetSequenceKey jwk = new OctetSequenceKey.Builder(key)
                .algorithm(JWSAlgorithm.HS256)
                .build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwk)));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey key,
                          @Value("${app.auth.jwt-issuer}") String issuer,
                          @Value("${app.auth.jwt-audience}") String audience) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer),
                new JwtClaimValidator<List<String>>("aud", values -> values != null && values.contains(audience))
        ));
        return decoder;
    }
}
