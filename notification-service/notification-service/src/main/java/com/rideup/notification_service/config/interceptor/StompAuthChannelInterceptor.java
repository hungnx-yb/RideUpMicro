package com.rideup.notification_service.config.interceptor;

import com.rideup.notification_service.config.CustomJwtDecoder;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;

@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final CustomJwtDecoder customJwtDecoder;
    private final JwtAuthenticationConverter jwtAuthenticationConverter;

    public StompAuthChannelInterceptor(CustomJwtDecoder customJwtDecoder,
                                       JwtAuthenticationConverter jwtAuthenticationConverter) {
        this.customJwtDecoder = customJwtDecoder;
        this.jwtAuthenticationConverter = jwtAuthenticationConverter;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }

        String token = extractToken(accessor);
        if (token == null || token.isBlank()) {
            return message;
        }

        Jwt jwt = customJwtDecoder.decode(token);
        AbstractAuthenticationToken authentication = (AbstractAuthenticationToken) jwtAuthenticationConverter.convert(jwt);
        if (authentication != null) {
            accessor.setUser(authentication);
        }

        return message;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        String header = getFirstNativeHeader(accessor, "Authorization");
        if (header == null) {
            header = getFirstNativeHeader(accessor, "authorization");
        }
        if (header == null) {
            return null;
        }

        if (header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return header;
    }

    private String getFirstNativeHeader(StompHeaderAccessor accessor, String headerName) {
        return accessor.getFirstNativeHeader(headerName);
    }
}
