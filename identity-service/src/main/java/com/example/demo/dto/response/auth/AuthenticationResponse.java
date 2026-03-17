package com.example.demo.dto.response.auth;

import com.example.demo.dto.response.user.UserResponse;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationResponse {
    String token;
    String refreshToken;
    boolean authenticated;
    UserResponse user;
}
