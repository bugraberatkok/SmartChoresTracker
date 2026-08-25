package com.capstone.choreapp.security;

import com.capstone.choreapp.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class JwtService {

    private final JwtEncoder jwtEncoder;
    private final long accessTokenMinutes;

    public JwtService(
            JwtEncoder jwtEncoder,
            @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes
    ) {
        this.jwtEncoder = jwtEncoder;
        this.accessTokenMinutes = accessTokenMinutes;
    }

    public String generateToken(User user) {

        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("choreapp")
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(
                        now.plus(accessTokenMinutes, ChronoUnit.MINUTES)
                )
                .build();

        JwsHeader header = JwsHeader
                .with(MacAlgorithm.HS256)
                .build();

        return jwtEncoder
                .encode(JwtEncoderParameters.from(header, claims))
                .getTokenValue();
    }
}