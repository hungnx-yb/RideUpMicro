package com.example.demo.dto.request.user;

import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

@Data
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class UserAvatarRequest {
    MultipartFile avatarFile;
}
