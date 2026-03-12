package com.example.demo.controller;

import com.example.demo.dto.request.DriverRegisterRequest;
import com.example.demo.dto.request.DriverUpdateRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.DriverResponse;
import com.example.demo.dto.response.DriverStatusResponse;
import com.example.demo.service.DriverService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/drivers")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverController {
    DriverService driverService;

    @PostMapping("/register")
    public ApiResponse<DriverResponse> registerDriver(@Valid @RequestBody DriverRegisterRequest request) {
        return ApiResponse.<DriverResponse>builder()
                .result(driverService.registerDriver(request))
                .message("Driver registration submitted successfully. Please wait for approval.")
                .build();
    }

    @GetMapping("/me")
    public ApiResponse<DriverResponse> getMyDriverProfile() {
        return ApiResponse.<DriverResponse>builder()
                .result(driverService.getMyDriverProfile())
                .message("Driver profile retrieved successfully")
                .build();
    }

    @PutMapping("/me")
    public ApiResponse<DriverResponse> updateMyDriverProfile(@RequestBody DriverUpdateRequest request) {
        return ApiResponse.<DriverResponse>builder()
                .result(driverService.updateMyDriverProfile(request))
                .message("Driver profile updated successfully")
                .build();
    }

    @GetMapping("/me/status")
    public ApiResponse<DriverStatusResponse> getMyDriverStatus() {
        return ApiResponse.<DriverStatusResponse>builder()
                .result(driverService.getMyDriverStatus())
                .message("Driver status retrieved successfully")
                .build();
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> deleteMyDriverProfile() {
        driverService.deleteMyDriverProfile();
        return ApiResponse.<Void>builder()
                .message("Driver profile deleted successfully")
                .build();
    }

}
