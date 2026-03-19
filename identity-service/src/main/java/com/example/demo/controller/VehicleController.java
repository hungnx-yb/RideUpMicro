package com.example.demo.controller;

import com.example.demo.dto.request.vehicle.VehicleRegisterRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.vehicle.VehicleResponse;
import com.example.demo.dto.response.vehicle.VehicleStatusResponse;
import com.example.demo.service.VehicleService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/vehicles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VehicleController {
    VehicleService vehicleService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<VehicleResponse> registerVehicle(@Valid @ModelAttribute VehicleRegisterRequest request) {
        return ApiResponse.<VehicleResponse>builder()
                .result(vehicleService.registerVehicle(request))
                .message("Vehicle registered successfully")
                .build();
    }

    @GetMapping("/me")
    public ApiResponse<VehicleResponse> getMyVehicle() {
        return ApiResponse.<VehicleResponse>builder()
                .result(vehicleService.getMyVehicle())
                .message("Vehicle information retrieved successfully")
                .build();
    }

    @GetMapping("/me/status")
    public ApiResponse<VehicleStatusResponse> getMyVehicleStatus() {
        return ApiResponse.<VehicleStatusResponse>builder()
                .result(vehicleService.getMyVehicleStatus())
                .message("Vehicle status retrieved successfully")
                .build();
    }

//    @PutMapping("/me")
//    public ApiResponse<VehicleResponse> updateMyVehicle(@Valid @RequestBody VehicleUpdateRequest request) {
//        return ApiResponse.<VehicleResponse>builder()
//                .result(vehicleService.updateMyVehicle(request))
//                .message("Vehicle information updated successfully")
//                .build();
//    }

//    @PutMapping("/me/documents")
//    public ApiResponse<VehicleResponse> updateMyVehicleDocuments(@RequestBody VehicleDocumentsUpdateRequest request) {
//        return ApiResponse.<VehicleResponse>builder()
//                .result(vehicleService.updateMyVehicleDocuments(request))
//                .message("Vehicle documents updated successfully")
//                .build();
//    }

    @DeleteMapping("/me")
    public ApiResponse<Void> deleteMyVehicle() {
        vehicleService.deleteMyVehicle();
        return ApiResponse.<Void>builder()
                .message("Vehicle deleted successfully")
                .build();
    }

//    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/admin/pending")
    public ApiResponse<List<VehicleResponse>> getPendingVehicles() {
        return ApiResponse.<List<VehicleResponse>>builder()
                .result(vehicleService.getPendingVehicles())
                .message("Pending vehicles retrieved successfully")
                .build();
    }

//    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/admin/{vehicleId}/approve")
    public ApiResponse<VehicleResponse> approveVehicle(@PathVariable String vehicleId) {
        return ApiResponse.<VehicleResponse>builder()
                .result(vehicleService.approveVehicle(vehicleId))
                .message("Vehicle approved successfully")
                .build();
    }

//    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/admin/{vehicleId}/reject")
    public ApiResponse<VehicleResponse> rejectVehicle(@PathVariable String vehicleId,
                                                      @RequestParam(required = false) String reason) {
        return ApiResponse.<VehicleResponse>builder()
                .result(vehicleService.rejectVehicle(vehicleId, reason))
                .message("Vehicle rejected successfully")
                .build();
    }

//    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/admin/count/pending-driver")
    public ApiResponse<Long>  getCountStatusVehicle(@RequestParam Boolean  isVerified) {
        return ApiResponse.<Long >builder()
                .result(vehicleService.countVehicleByStatus(isVerified))
                .build();
    }



}
