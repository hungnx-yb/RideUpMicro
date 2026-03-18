package com.rideup.locationservice.controller;

import com.rideup.locationservice.dto.response.ApiResponse;
import com.rideup.locationservice.dto.response.ProvinceResponse;
import com.rideup.locationservice.dto.response.WardResponse;
import com.rideup.locationservice.service.LocationService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class LocationController {

    LocationService locationService;

    @GetMapping("/province")
    public ApiResponse<List<ProvinceResponse>> getAllProvinces(@RequestParam(required = false) String keyword) {
        return ApiResponse.<List<ProvinceResponse>>builder()
                .result(locationService.getAllProvinces(keyword))
                .message("Get all provinces successfully!")
                .build();
    }

    @GetMapping("ward")
    public ApiResponse<List<WardResponse>> getAllWards(@RequestParam(required = false) String keyword,
                                                       @RequestParam String provinceId) {
        return ApiResponse.<List<WardResponse>>builder()
                .result(locationService.getAllWards(keyword, provinceId))
                .message("Get all wards successfully!")
                .build();
    }

    @GetMapping("/province/{provinceId}")
    public ApiResponse<ProvinceResponse> getProvinceById(@PathVariable String provinceId) {
        return ApiResponse.<ProvinceResponse>builder()
                .result(locationService.getDetailProvince(provinceId))
                .message("Get province successfully!")
                .build();
    }
}
