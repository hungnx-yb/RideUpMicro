package com.example.demo.service;

import com.example.demo.dto.request.user.DriverRegisterRequest;
import com.example.demo.dto.request.user.DriverUpdateRequest;
import com.example.demo.dto.response.user.DriverResponse;
import com.example.demo.dto.response.user.DriverStatusResponse;
import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.enums.DriverStatus;
import com.example.demo.enums.Role;
import com.example.demo.exception.AppException;
import com.example.demo.exception.ErrorCode;
import com.example.demo.repository.DriverProfileRepository;
import com.example.demo.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverService {
    DriverProfileRepository driverProfileRepository;
    UserRepository userRepository;
    UserService userService;
    ModelMapper modelMapper;
    FileService fileService;

    @Transactional
    public DriverResponse registerDriver(DriverRegisterRequest request) {
        User currentUser = userService.getCurrentUser();
        if (driverProfileRepository.existsByUser(currentUser)) {
            throw new AppException(ErrorCode.DRIVER_ALREADY_REGISTERED);
        }
        
        if (driverProfileRepository.existsByCccd(request.getCccd())) {
            throw new AppException(ErrorCode.CCCD_ALREADY_USED);
        }
        
        if (driverProfileRepository.existsByGplx(request.getGplx())) {
            throw new AppException(ErrorCode.GPLX_ALREADY_USED);
        }
        
        if (request.getGplxExpiryDate().isBefore(LocalDate.now())) {
            throw new AppException(ErrorCode.GPLX_EXPIRED);
        }
        String cccdImageFrontUrl = fileService.upload(request.getCccdImageFront(), "drivers/documents");
        String cccdImageBackUrl = fileService.upload(request.getCccdImageBack(), "drivers/documents");
        String gplxImageUrl = fileService.upload(request.getGplxImage(), "drivers/documents");
        DriverProfile driverProfile = DriverProfile.builder()
                .user(currentUser)
                .cccd(request.getCccd())
                .cccdImageFront(cccdImageFrontUrl)
                .cccdImageBack(cccdImageBackUrl)
                .gplx(request.getGplx())
                .gplxExpiryDate(request.getGplxExpiryDate())
                .gplxImage(gplxImageUrl)
                .status(DriverStatus.PENDING)
                .driverRating(5.0)
                .totalDriverRides(0)
                .build();
        
        driverProfile = driverProfileRepository.save(driverProfile);
        currentUser.getRoles().add(Role.DRIVER);
        userRepository.save(currentUser);
        return modelMapper.map(driverProfile, DriverResponse.class);
    }

    public DriverResponse getMyDriverProfile() {
        User currentUser = userService.getCurrentUser();
        
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
        return modelMapper.map(driverProfile, DriverResponse.class);
    }

    @Transactional
    public DriverResponse updateMyDriverProfile(DriverUpdateRequest request) {
        User currentUser = userService.getCurrentUser();
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
        if (driverProfile.getStatus() == DriverStatus.APPROVED) {
            throw new AppException(ErrorCode.CANNOT_UPDATE_APPROVED_DRIVER);
        }
        if (request.getCccd() != null && !request.getCccd().equals(driverProfile.getCccd())) {
            if (driverProfileRepository.existsByCccd(request.getCccd())) {
                throw new AppException(ErrorCode.CCCD_ALREADY_USED);
            }
            driverProfile.setCccd(request.getCccd());
        }
        if (request.getCccdImageFront() != null) {
            driverProfile.setCccdImageFront(fileService.upload(request.getCccdImageFront(), "drivers/documents"));
        }
        if (request.getCccdImageBack() != null) {
            driverProfile.setCccdImageBack(fileService.upload(request.getCccdImageBack(), "drivers/documents"));
        }
        if (request.getGplx() != null && !request.getGplx().equals(driverProfile.getGplx())) {
            if (driverProfileRepository.existsByGplx(request.getGplx())) {
                throw new AppException(ErrorCode.GPLX_ALREADY_USED);
            }
            driverProfile.setGplx(request.getGplx());
        }
        if (request.getGplxExpiryDate() != null) {
            if (request.getGplxExpiryDate().isBefore(LocalDate.now())) {
                throw new AppException(ErrorCode.GPLX_EXPIRED);
            }
            driverProfile.setGplxExpiryDate(request.getGplxExpiryDate());
        }
        
        if (request.getGplxImage() != null) {
            driverProfile.setGplxImage(fileService.upload(request.getGplxImage(), "drivers/documents"));
        }
        
        if (driverProfile.getStatus() == DriverStatus.REJECTED) {
            driverProfile.setStatus(DriverStatus.PENDING);
            driverProfile.setRejectedAt(null);
            driverProfile.setRejectionReason(null);
        }
        
        driverProfile = driverProfileRepository.save(driverProfile);
        return modelMapper.map(driverProfile, DriverResponse.class);
    }

    public DriverStatusResponse getMyDriverStatus() {
        User currentUser = userService.getCurrentUser();
        
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
        
        String message = switch (driverProfile.getStatus()) {
            case PENDING -> "Your driver registration is being reviewed by our team.";
            case APPROVED -> "Congratulations! Your driver account has been approved.";
            case REJECTED -> "Your driver registration has been rejected. Reason: " + 
                           (driverProfile.getRejectionReason() != null ? driverProfile.getRejectionReason() : "Not specified");
        };
        
        DriverStatusResponse driverStatusResponse = modelMapper.map(driverProfile, DriverStatusResponse.class);
        driverStatusResponse.setMessage(message);
        return driverStatusResponse;
    }

    @Transactional
    public void deleteMyDriverProfile() {
        User currentUser = userService.getCurrentUser();
        
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));

        currentUser.getRoles().remove(Role.DRIVER);
        userRepository.save(currentUser);
        driverProfileRepository.delete(driverProfile);
    }

    public List<DriverResponse> getPendingDrivers() {
        return driverProfileRepository.findAllByStatus(DriverStatus.PENDING)
                .stream()
                .map(this::mapToDriverResponse)
                .toList();
    }

    @Transactional
    public DriverResponse approveDriver(String driverId) {
        DriverProfile driverProfile = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));

        User approver = userService.getCurrentUser();
        driverProfile.setStatus(DriverStatus.APPROVED);
        driverProfile.setApprovedAt(LocalDateTime.now());
        driverProfile.setApprovedBy(approver.getEmail());
        driverProfile.setUser(approver);
        driverProfile = driverProfileRepository.save(driverProfile);
        return modelMapper.map(driverProfile, DriverResponse.class);
    }

    @Transactional
    public DriverResponse rejectDriver(String driverId, String reason) {
        DriverProfile driverProfile = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));

        User approver = userService.getCurrentUser();
        driverProfile.setStatus(DriverStatus.REJECTED);
        driverProfile.setRejectedAt(LocalDateTime.now());
        driverProfile.setRejectionReason(reason);
        driverProfile.setApprovedAt(null);
        driverProfile.setApprovedBy(approver.getEmail());

        driverProfile = driverProfileRepository.save(driverProfile);
        return modelMapper.map(driverProfile, DriverResponse.class);
    }

    public Long countDriverByStatus(String  status) {
        return  driverProfileRepository.countByStatus(DriverStatus.valueOf(status));
    }

    private DriverResponse mapToDriverResponse(DriverProfile driverProfile) {

        DriverResponse response = modelMapper.map(driverProfile, DriverResponse.class);

        if (driverProfile.getUser() != null) {
            response.setUserId(driverProfile.getUser().getId());
            response.setFullName(driverProfile.getUser().getFullName());
            response.setEmail(driverProfile.getUser().getEmail());
            response.setPhoneNumber(driverProfile.getUser().getPhoneNumber());
            response.setAvatarUrl(driverProfile.getUser().getAvatarUrl());
        }

        return response;
    }


    public List<DriverResponse>  getDriverDetailList(List<String> driverIds){
        return driverProfileRepository.getDriverDetailList(driverIds);
    }
}
