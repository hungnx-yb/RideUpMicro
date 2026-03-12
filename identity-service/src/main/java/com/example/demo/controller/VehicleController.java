package com.example.demo.controller;

import com.example.demo.dto.request.VehicleDocumentsUpdateRequest;
import com.example.demo.dto.request.VehicleRegisterRequest;
import com.example.demo.dto.request.VehicleUpdateRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.VehicleResponse;
import com.example.demo.service.VehicleService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/vehicles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VehicleController {
    VehicleService vehicleService;

    @PostMapping
    public ApiResponse<VehicleResponse> registerVehicle(@Valid @RequestBody VehicleRegisterRequest request) {
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

}
