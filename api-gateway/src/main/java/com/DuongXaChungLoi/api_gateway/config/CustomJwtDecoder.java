package com.DuongXaChungLoi.api_gateway.config;

import com.DuongXaChungLoi.api_gateway.constant.RedisPrefixKeyConstant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;


import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;


@Component
public class CustomJwtDecoder implements JwtDecoder {

    @Value("${jwt.signerKey}")
    private String signerKey;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private volatile NimbusJwtDecoder nimbusJwtDecoder;

    @Override
    public Jwt decode(String token) throws JwtException {
        if (nimbusJwtDecoder == null) {
            synchronized (this) {
                if (nimbusJwtDecoder == null) {
                    SecretKeySpec keySpec = new SecretKeySpec(
                            signerKey.getBytes(StandardCharsets.UTF_8),
                            "HmacSHA512"
                    );

                    nimbusJwtDecoder = NimbusJwtDecoder
                            .withSecretKey(keySpec)
                            .macAlgorithm(MacAlgorithm.HS512)
                            .build();
                }
            }
        }

        try {
            Jwt jwt = nimbusJwtDecoder.decode(token);

            String jti = jwt.getId();
            if (jti == null || jti.isBlank()) {
                throw new JwtException("Token missing jti");
            }

            boolean exists = Boolean.TRUE.equals(
                    redisTemplate.hasKey(RedisPrefixKeyConstant.TOKEN + token)
            );

            if (!exists) {
                throw new JwtException("Token expired or revoked (Redis)");
            }

            return jwt;

        } catch (JwtException e) {
            throw e;
        } catch (Exception e) {
            throw new JwtException("Invalid token", e);
        }
    }
}
