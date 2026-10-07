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
    AiServiceClient aiServiceClient;
    ObjectMapper objectMapper;

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
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));

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
