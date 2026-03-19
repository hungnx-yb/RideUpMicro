package com.example.demo.controller;

import com.example.demo.dto.request.user.UserAvatarRequest;
import com.example.demo.dto.request.user.UserInforRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.user.UserResponse;
import com.example.demo.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class UserController {

    UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMyInfor(){
        return ApiResponse.<UserResponse>builder()
                .result(userService.getMyInfor())
                .message("Get my information successfully")
                .build();
    }

    @GetMapping("/{userId}")
    public ApiResponse<UserResponse>  getUserInfor( @PathVariable String userId){
        return ApiResponse.<UserResponse>builder()
                .result(userService.getUserInfor(userId))
                .message("Get user information successfully")
                .build();
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserResponse> uploadAvatar(@ModelAttribute UserAvatarRequest request) {
        return ApiResponse.<UserResponse>builder()
                .result(userService.uploadAvatar(request))
                .message("Upload avatar successfully")
                .build();
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateMyInfor(@RequestBody UserInforRequest request){
        return ApiResponse.<UserResponse>builder()
                .result(userService.updateMyInfor(request))
                .message("Update user information successfully")
                .build();
    }


    @PostMapping()
    public ApiResponse<List<UserResponse>> getUserByIds(@RequestBody List<String> userIds){
       return ApiResponse.<List<UserResponse>>builder()
               .result(userService.getUserByIds(userIds))
               .build();
    }

}
