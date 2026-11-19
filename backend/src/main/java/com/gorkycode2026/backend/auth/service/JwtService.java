package com.gorkycode2026.backend.auth.service;

import com.gorkycode2026.backend.auth.model.UserAccount;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final JwtEncoder encoder;
    private final String issuer;
    private final String audience;
    private final long accessTtlSeconds;

    public JwtService(JwtEncoder encoder,
                      @Value("${app.auth.jwt-issuer}") String issuer,
                      @Value("${app.auth.jwt-audience}") String audience,
                      @Value("${app.auth.access-ttl-seconds}") long accessTtlSeconds) {
        this.encoder = encoder;
        this.issuer = issuer;
        this.audience = audience;
        this.accessTtlSeconds = accessTtlSeconds;
    }

    public String issueAccessToken(UserAccount user, Instant now) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .audience(List.of(audience))
                .subject(user.getId().toString())
                .issuedAt(now)
                .notBefore(now)
                .expiresAt(now.plusSeconds(accessTtlSeconds))
                .build();
        JwsHeader headers = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(headers, claims)).getTokenValue();
    }

    public long accessTtlSeconds() { return accessTtlSeconds; }
}
