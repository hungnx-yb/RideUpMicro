package com.rideup.locationservice.service;

import com.rideup.locationservice.dto.response.ProvinceResponse;
import com.rideup.locationservice.dto.response.WardResponse;
import com.rideup.locationservice.entity.Province;
import com.rideup.locationservice.repository.ProvinceRepository;
import com.rideup.locationservice.repository.WardRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)

public class LocationService {
    ProvinceRepository provinceRepository;
    WardRepository  wardRepository;
    ModelMapper modelMapper;

    public List<ProvinceResponse> getAllProvinces(String keyword) {
        return provinceRepository.getAllProvinces(keyword)
                .stream()
                .map(p -> modelMapper.map(p, ProvinceResponse.class))
                .toList();
    }

    public List<WardResponse> getAllWards(String keyword, String provinceId) {
        return wardRepository.getAllWards(keyword, provinceId )
                .stream()
                .map(ward -> modelMapper.map(ward, WardResponse.class))
                .toList();
    }
}
