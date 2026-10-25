package com.example.demo.service;

import com.example.demo.dto.request.user.DriverRegisterRequest;
import com.example.demo.dto.request.user.DriverUpdateRequest;
import com.example.demo.dto.response.user.DriverResponse;
import com.example.demo.dto.response.user.DriverStatusResponse;
import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.entity.Vehicle;
import com.example.demo.enums.DriverStatus;
import com.example.demo.enums.Role;
import com.example.demo.exception.AppException;
import com.example.demo.exception.ErrorCode;
import com.example.demo.repository.DriverProfileRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.client.ai.*;
import com.example.demo.dto.request.driver.DriverFaceCompareRequest;
import com.example.demo.dto.request.driver.DriverFaceEnrollRequest;
import com.example.demo.dto.request.driver.DriverFaceVerifyRequest;
import com.example.demo.dto.response.driver.DriverFaceCompareResponse;
import com.example.demo.dto.response.driver.DriverFaceStatusResponse;
import com.example.demo.dto.response.driver.DriverFaceVerifyResponse;
import java.time.temporal.ChronoUnit;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DriverService {
    DriverProfileRepository driverProfileRepository;
    UserRepository userRepository;
    com.example.demo.repository.VehicleRepository vehicleRepository;
    UserService userService;
    ModelMapper modelMapper;
    FileService fileService;
    AiServiceClient aiServiceClient;
    ObjectMapper objectMapper;

    @Transactional
    public DriverResponse registerDriver(DriverRegisterRequest request) {
        User currentUser = userService.getCurrentUser();
        DriverProfile existingProfile = driverProfileRepository.findByUser(currentUser).orElse(null);
        if (existingProfile != null && existingProfile.getCccd() != null && !existingProfile.getCccd().isBlank()) {
            if (existingProfile.getStatus() != DriverStatus.REJECTED) {
                throw new AppException(ErrorCode.DRIVER_ALREADY_REGISTERED);
            }
        }
        
        if (existingProfile == null || !request.getCccd().equals(existingProfile.getCccd())) {
            if (driverProfileRepository.existsByCccd(request.getCccd())) {
                throw new AppException(ErrorCode.CCCD_ALREADY_USED);
            }
        }
        
        if (existingProfile == null || !request.getGplx().equals(existingProfile.getGplx())) {
            if (driverProfileRepository.existsByGplx(request.getGplx())) {
                throw new AppException(ErrorCode.GPLX_ALREADY_USED);
            }
        }
        
        if (request.getGplxExpiryDate() != null && request.getGplxExpiryDate().isBefore(LocalDate.now())) {
            throw new AppException(ErrorCode.GPLX_EXPIRED);
        }
        String cccdImageFrontUrl = fileService.upload(request.getCccdImageFront(), "drivers/documents");
        String cccdImageBackUrl = fileService.upload(request.getCccdImageBack(), "drivers/documents");
        String portraitImageUrl = request.getPortraitImage() != null 
                ? fileService.upload(request.getPortraitImage(), "drivers/documents") 
                : null;
        String gplxImageFrontUrl = request.getGplxImageFront() != null 
                ? fileService.upload(request.getGplxImageFront(), "drivers/documents")
                : null;
        String gplxImageBackUrl = request.getGplxImageBack() != null 
                ? fileService.upload(request.getGplxImageBack(), "drivers/documents")
                : null;

        DriverProfile driverProfile = existingProfile != null ? existingProfile : DriverProfile.builder()
                .user(currentUser)
                .driverRating(5.0)
                .totalDriverRides(0)
                .build();

        driverProfile.setCccd(request.getCccd());
        driverProfile.setCccdImageFront(cccdImageFrontUrl);
        driverProfile.setCccdImageBack(cccdImageBackUrl);
        if (portraitImageUrl != null) {
            driverProfile.setPortraitImage(portraitImageUrl);
            if (currentUser.getAvatarUrl() == null || currentUser.getAvatarUrl().isBlank()) {
                currentUser.setAvatarUrl(portraitImageUrl);
            }
        }
        driverProfile.setGplx(request.getGplx());
        driverProfile.setGplxIssueDate(request.getGplxIssueDate());
        driverProfile.setGplxExpiryDate(request.getGplxExpiryDate());
        driverProfile.setGplxIssuePlace(request.getGplxIssuePlace());
        driverProfile.setGplxImageFront(gplxImageFrontUrl);
        driverProfile.setGplxImageBack(gplxImageBackUrl);
        if (request.getGplxClasses() != null && !request.getGplxClasses().isEmpty()) {
            driverProfile.setGplxClasses(String.join(", ", request.getGplxClasses()));
        }
        driverProfile.setStatus(DriverStatus.PENDING);
        driverProfile.setRejectedAt(null);
        driverProfile.setRejectionReason(null);
        driverProfile.setApprovedAt(null);
        driverProfile.setApprovedBy(null);
        
        driverProfile = driverProfileRepository.save(driverProfile);
        currentUser.getRoles().add(Role.DRIVER);
        userRepository.save(currentUser);

        // Lưu thông tin xe của tài xế nếu có gửi lên cùng
        if (request.getPlateNumber() != null && !request.getPlateNumber().isBlank()) {
            String vehImg = request.getVehicleImage() != null ? fileService.upload(request.getVehicleImage(), "vehicles/images") : gplxImageFrontUrl;
            
            MultipartFile regFrontFile = request.getRegistrationImageFront() != null ? request.getRegistrationImageFront() : request.getRegistrationImage();
            String regImg = regFrontFile != null ? fileService.upload(regFrontFile, "vehicles/documents") : gplxImageFrontUrl;
            
            MultipartFile regBackFile = request.getRegistrationImageBack() != null ? request.getRegistrationImageBack() : request.getInsuranceImage();
            String insImg = regBackFile != null ? fileService.upload(regBackFile, "vehicles/documents") : null;
            Vehicle vehicle = driverProfile.getVehicle() != null ? driverProfile.getVehicle() : new Vehicle();
            vehicle.setDriver(driverProfile);
            vehicle.setPlateNumber(request.getPlateNumber());
            vehicle.setVehicleBrand(request.getVehicleBrand());
            vehicle.setVehicleModel(request.getVehicleModel());
            vehicle.setVehicleColor(request.getVehicleColor());
            vehicle.setVehicleYear(request.getVehicleYear() != null ? request.getVehicleYear() : 2022);
            vehicle.setSeatCapacity(request.getSeatCapacity() != null ? request.getSeatCapacity() : 2);
            vehicle.setVehicleType(request.getVehicleType() != null ? request.getVehicleType() : com.example.demo.enums.VehicleType.CAR_4_SEAT);
            vehicle.setVehicleImage(vehImg);
            vehicle.setRegistrationImage(regImg);
            vehicle.setInsuranceImage(insImg);
            vehicle.setIsVerified(false);
            vehicle.setRejectedAt(null);
            vehicle.setRejectionReason(null);
            vehicleRepository.save(vehicle);
            driverProfile.setVehicle(vehicle);
        }

        return mapToDriverResponse(driverProfile);
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
        if (request.getGplxIssueDate() != null) {
            driverProfile.setGplxIssueDate(request.getGplxIssueDate());
        }
        if (request.getGplxIssuePlace() != null) {
            driverProfile.setGplxIssuePlace(request.getGplxIssuePlace());
        }
        if (request.getGplxExpiryDate() != null) {
            if (request.getGplxExpiryDate().isBefore(LocalDate.now())) {
                throw new AppException(ErrorCode.GPLX_EXPIRED);
            }
            driverProfile.setGplxExpiryDate(request.getGplxExpiryDate());
        }
        
        if (request.getGplxImageFront() != null) {
            driverProfile.setGplxImageFront(fileService.upload(request.getGplxImageFront(), "drivers/documents"));
        }
        if (request.getGplxImageBack() != null) {
            driverProfile.setGplxImageBack(fileService.upload(request.getGplxImageBack(), "drivers/documents"));
        }
        
        if (request.getGplxClasses() != null) {
            driverProfile.setGplxClasses(String.join(", ", request.getGplxClasses()));
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
        driverProfile = driverProfileRepository.save(driverProfile);
        return mapToDriverResponse(driverProfile);
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

        if (driverProfile.getVehicle() != null) {
            Vehicle vehicle = driverProfile.getVehicle();
            response.setVehicleId(vehicle.getId());
            response.setPlateNumber(vehicle.getPlateNumber());
            response.setVehicleBrand(vehicle.getVehicleBrand());
            response.setVehicleModel(vehicle.getVehicleModel());
            response.setVehicleColor(vehicle.getVehicleColor());
            response.setVehicleYear(vehicle.getVehicleYear());
            response.setSeatCapacity(vehicle.getSeatCapacity());
            response.setVehicleType(vehicle.getVehicleType() != null ? vehicle.getVehicleType().name() : null);
            response.setVehicleImage(vehicle.getVehicleImage());
            response.setRegistrationImage(vehicle.getRegistrationImage());
            response.setInsuranceImage(vehicle.getInsuranceImage());
        }

        if (driverProfile.getGplxClasses() != null && !driverProfile.getGplxClasses().isBlank()) {
            String[] parts = driverProfile.getGplxClasses().split("[,\\s]+");
            response.setGplxClasses(java.util.Arrays.stream(parts).filter(s -> !s.isBlank()).toList());
        }

        return response;
    }


    public List<DriverResponse>  getDriverDetailList(List<String> driverIds){
        return driverProfileRepository.getDriverDetailList(driverIds);
    }

    public java.math.BigDecimal getDriverDebt(String driverId) {
        DriverProfile driverProfile = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
        return driverProfile.getSystemDebt();
    }

    @Transactional
    public void addDriverDebt(String driverId, java.math.BigDecimal amount) {
        DriverProfile driverProfile = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
        
        java.math.BigDecimal currentDebt = driverProfile.getSystemDebt() != null ? driverProfile.getSystemDebt() : java.math.BigDecimal.ZERO;
        driverProfile.setSystemDebt(currentDebt.add(amount));
        driverProfileRepository.save(driverProfile);
    }

    @Transactional
    public DriverResponse enrollFace(DriverFaceEnrollRequest request) {
        User currentUser = userService.getCurrentUser();
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseGet(() -> {
                    // Nếu tài xế quét eKYC ở Bước 1 trước khi gửi form thông tin -> tự động tạo hồ sơ nháp
                    DriverProfile draft = DriverProfile.builder()
                            .user(currentUser)
                            .status(DriverStatus.PENDING)
                            .driverRating(5.0)
                            .totalDriverRides(0)
                            .isFaceEnrolled(false)
                            .build();
                    return driverProfileRepository.save(draft);
                });

        AiExtractEmbeddingResponse aiResponse;
        try {
            aiResponse = aiServiceClient.extractEmbedding(AiExtractEmbeddingRequest.builder()
                    .imageBase64(request.getImageBase64())
                    .checkLiveness(true)
                    .build());
        } catch (Exception e) {
            log.error("[AI Service Error] Failed to call extractEmbedding: {}", e.getMessage());
            throw new AppException(ErrorCode.AI_SERVICE_ERROR);
        }

        if (aiResponse == null || "error".equalsIgnoreCase(aiResponse.getStatus())) {
            throw new AppException(ErrorCode.AI_SERVICE_ERROR);
        }

        if (Boolean.FALSE.equals(aiResponse.getIsReal())) {
            throw new AppException(ErrorCode.FACE_SPOOF_DETECTED);
        }

        if (aiResponse.getEmbedding() == null || aiResponse.getEmbedding().isEmpty()) {
            throw new AppException(ErrorCode.FACE_VERIFICATION_FAILED);
        }

        // So sánh khuôn mặt quét eKYC với ảnh chân dung trên thẻ CCCD
        String cccdBase64 = null;
        if (request.getCccdImageBase64() != null && !request.getCccdImageBase64().isBlank()) {
            cccdBase64 = request.getCccdImageBase64();
        } else if (driverProfile.getCccdImageFront() != null && !driverProfile.getCccdImageFront().isBlank()) {
            try {
                cccdBase64 = fileService.downloadAsBase64(driverProfile.getCccdImageFront());
            } catch (Exception e) {
                log.warn("Lỗi khi tải ảnh CCCD từ Cloud: {}", e.getMessage());
            }
        }

        if (cccdBase64 != null && !cccdBase64.isBlank()) {
            try {
                AiCompareFacesResponse compareRes = aiServiceClient.compareFaces(AiCompareFacesRequest.builder()
                        .image1Base64(cccdBase64)
                        .image2Base64(request.getImageBase64())
                        .threshold(0.55)
                        .checkLiveness(false)
                        .build());

                if (compareRes != null && Boolean.FALSE.equals(compareRes.getIsMatched())) {
                    log.warn("Khuôn mặt quét eKYC không trùng khớp với ảnh CCCD. Similarity: {}", compareRes.getSimilarity());
                    throw new AppException(ErrorCode.FACE_NOT_MATCH_ID_CARD);
                }

                if (compareRes != null && compareRes.getSimilarity() != null) {
                    driverProfile.setFaceMatchScore(compareRes.getSimilarity());
                }
            } catch (AppException ae) {
                throw ae;
            } catch (Exception e) {
                log.error("Lỗi khi gọi AI so khớp ảnh chân dung CCCD và selfie: {}", e.getMessage());
                throw new AppException(ErrorCode.AI_SERVICE_ERROR);
            }
        }

        try {
            String embeddingJson = objectMapper.writeValueAsString(aiResponse.getEmbedding());
            driverProfile.setFaceEmbedding(embeddingJson);
            driverProfile.setIsFaceEnrolled(true);
            driverProfile.setLastFaceVerifiedAt(LocalDateTime.now());
            driverProfile = driverProfileRepository.save(driverProfile);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize face embedding: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGOEIZED_EXCEPTION);
        }

        return mapToDriverResponse(driverProfile);
    }

    @Transactional
    public DriverFaceVerifyResponse verifyFaceToCheckIn(DriverFaceVerifyRequest request) {
        User currentUser = userService.getCurrentUser();
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));

        if (Boolean.FALSE.equals(driverProfile.getIsFaceEnrolled()) || driverProfile.getFaceEmbedding() == null) {
            throw new AppException(ErrorCode.FACE_NOT_ENROLLED);
        }

        List<Double> targetEmbedding;
        try {
            targetEmbedding = objectMapper.readValue(driverProfile.getFaceEmbedding(), new TypeReference<List<Double>>() {});
        } catch (JsonProcessingException e) {
            log.error("Failed to parse stored face embedding: {}", e.getMessage());
            throw new AppException(ErrorCode.UNCATEGOEIZED_EXCEPTION);
        }

        AiVerifyDriverResponse aiResponse;
        try {
            aiResponse = aiServiceClient.verifyDriver(AiVerifyDriverRequest.builder()
                    .imageBase64(request.getImageBase64())
                    .targetEmbedding(targetEmbedding)
                    .threshold(0.65)
                    .build());
        } catch (Exception e) {
            log.error("[AI Service Error] Failed to call verifyDriver: {}", e.getMessage());
            throw new AppException(ErrorCode.AI_SERVICE_ERROR);
        }

        if (aiResponse == null) {
            throw new AppException(ErrorCode.AI_SERVICE_ERROR);
        }

        if (Boolean.FALSE.equals(aiResponse.getIsReal())) {
            throw new AppException(ErrorCode.FACE_SPOOF_DETECTED);
        }

        if (!Boolean.TRUE.equals(aiResponse.getIsVerified())) {
            throw new AppException(ErrorCode.FACE_VERIFICATION_FAILED);
        }

        driverProfile.setLastFaceVerifiedAt(LocalDateTime.now());
        driverProfileRepository.save(driverProfile);

        return DriverFaceVerifyResponse.builder()
                .isVerified(true)
                .isReal(true)
                .similarity(aiResponse.getSimilarity())
                .livenessScore(aiResponse.getLivenessScore())
                .message("Xác minh khuôn mặt tài xế thành công")
                .verifiedAt(driverProfile.getLastFaceVerifiedAt())
                .build();
    }

    public DriverFaceStatusResponse getFaceVerificationStatus() {
        User currentUser = userService.getCurrentUser();
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));

        boolean isEnrolled = Boolean.TRUE.equals(driverProfile.getIsFaceEnrolled());
        LocalDateTime lastVerified = driverProfile.getLastFaceVerifiedAt();

        if (!isEnrolled) {
            return DriverFaceStatusResponse.builder()
                    .isFaceEnrolled(false)
                    .lastFaceVerifiedAt(lastVerified)
                    .isValidToday(false)
                    .status("NOT_ENROLLED")
                    .message("Tài xế chưa hoàn thành đăng ký khuôn mặt (eKYC)")
                    .build();
        }

        if (lastVerified == null) {
            return DriverFaceStatusResponse.builder()
                    .isFaceEnrolled(true)
                    .lastFaceVerifiedAt(null)
                    .isValidToday(false)
                    .status("NEEDS_VERIFY")
                    .message("Tài xế cần quét khuôn mặt điểm danh trước khi hoạt động")
                    .build();
        }

        long hoursSinceVerification = ChronoUnit.HOURS.between(lastVerified, LocalDateTime.now());
        boolean isValidToday = hoursSinceVerification < 24;

        return DriverFaceStatusResponse.builder()
                .isFaceEnrolled(true)
                .lastFaceVerifiedAt(lastVerified)
                .isValidToday(isValidToday)
                .status(isValidToday ? "VALID" : "EXPIRED")
                .message(isValidToday ? "Trạng thái sinh trắc học hợp lệ" : "Đã quá 24h kể từ lần điểm danh cuối, vui lòng quét lại khuôn mặt")
                .build();
    }

    public DriverFaceCompareResponse compareFaces(DriverFaceCompareRequest request) {
        AiCompareFacesResponse aiResponse;
        try {
            aiResponse = aiServiceClient.compareFaces(AiCompareFacesRequest.builder()
                    .image1Base64(request.getImage1Base64())
                    .image2Base64(request.getImage2Base64())
                    .threshold(request.getThreshold() != null ? request.getThreshold() : 0.65)
                    .checkLiveness(true)
                    .build());
        } catch (Exception e) {
            log.error("[AI Service Error] Failed to call compareFaces: {}", e.getMessage());
            throw new AppException(ErrorCode.AI_SERVICE_ERROR);
        }

        if (aiResponse == null) {
            throw new AppException(ErrorCode.AI_SERVICE_ERROR);
        }

        return DriverFaceCompareResponse.builder()
                .isMatched(aiResponse.getIsMatched())
                .isReal(aiResponse.getIsReal())
                .similarity(aiResponse.getSimilarity())
                .threshold(aiResponse.getThreshold())
                .message(aiResponse.getMessage())
                .build();
    }
}
