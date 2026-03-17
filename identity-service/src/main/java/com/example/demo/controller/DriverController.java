package com.example.demo.controller;

import com.example.demo.dto.request.user.DriverRegisterRequest;
import com.example.demo.dto.request.user.DriverUpdateRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.user.DriverResponse;
import com.example.demo.dto.response.user.DriverStatusResponse;
import com.example.demo.service.DriverService;
import io.lettuce.core.dynamic.annotation.Param;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/drivers")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverController {
    DriverService driverService;

    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<DriverResponse> registerDriver( @ModelAttribute DriverRegisterRequest request) {
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

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<DriverResponse> updateMyDriverProfile(@ModelAttribute DriverUpdateRequest request) {
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

//    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/admin/pending")
    public ApiResponse<List<DriverResponse>> getPendingDrivers() {
        return ApiResponse.<List<DriverResponse>>builder()
                .result(driverService.getPendingDrivers())
                .message("Pending drivers retrieved successfully")
                .build();
    }

//    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/admin/{driverId}/approve")
    public ApiResponse<DriverResponse> approveDriver(@PathVariable String driverId) {
        return ApiResponse.<DriverResponse>builder()
                .result(driverService.approveDriver(driverId))
                .message("Driver approved successfully")
                .build();
    }

//    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/admin/{driverId}/reject")
    public ApiResponse<DriverResponse> rejectDriver(@PathVariable String driverId,
                                                    @RequestParam(required = false) String reason) {
        return ApiResponse.<DriverResponse>builder()
                .result(driverService.rejectDriver(driverId, reason))
                .message("Driver rejected successfully")
                .build();
    }

    @GetMapping("/admin/count/pending-driver")
    public ApiResponse<Long>  getCountStatusDrivers(@RequestParam String status) {
        return ApiResponse.<Long >builder()
                .result(driverService.countDriverByStatus(status))
                .build();
    }

}
