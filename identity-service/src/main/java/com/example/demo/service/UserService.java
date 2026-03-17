package com.example.demo.service;
import com.example.demo.constant.StoragePrefixConstant;
import com.example.demo.dto.request.user.UserAvatarRequest;
import com.example.demo.dto.request.user.UserInforRequest;
import com.example.demo.dto.response.user.UserResponse;
import com.example.demo.entity.User;
import com.example.demo.exception.AppException;
import com.example.demo.exception.ErrorCode;
import com.example.demo.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;
    ModelMapper modelMapper;
    FileService fileService;

    public User getCurrentUser() {
        User user = userRepository.findById(SecurityContextHolder.getContext().getAuthentication().getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return user;
    }

    public UserResponse getMyInfor() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return modelMapper.map(user, UserResponse.class);
    }

    public UserResponse getUserInfor(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return modelMapper.map(user, UserResponse.class);
    }


    public UserResponse uploadAvatar(UserAvatarRequest request) {
        User  user = getCurrentUser();
        if(!Objects.isNull(user.getAvatarUrl())){
            fileService.delete(user.getAvatarUrl());
        }
        String avatarUrl = fileService.upload(request.getAvatarFile(), StoragePrefixConstant.AVATARS);
        user.setAvatarUrl(avatarUrl);
        return modelMapper.map(userRepository.save(user), UserResponse.class);
    }

    public UserResponse updateMyInfor(UserInforRequest request) {
        User user = getCurrentUser();
        modelMapper.map(user, request);
        return modelMapper.map(userRepository.save(user), UserResponse.class);
    }
}
