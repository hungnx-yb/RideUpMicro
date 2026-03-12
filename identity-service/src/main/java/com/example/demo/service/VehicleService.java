package com.example.demo.service;

import com.example.demo.dto.request.VehicleDocumentsUpdateRequest;
import com.example.demo.dto.request.VehicleRegisterRequest;
import com.example.demo.dto.request.VehicleUpdateRequest;
import com.example.demo.dto.response.VehicleResponse;
import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.User;
import com.example.demo.entity.Vehicle;
import com.example.demo.enums.DriverStatus;
import com.example.demo.exception.AppException;
import com.example.demo.exception.ErrorCode;
import com.example.demo.repository.DriverProfileRepository;
import com.example.demo.repository.VehicleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class VehicleService {
    VehicleRepository vehicleRepository;
    DriverProfileRepository driverProfileRepository;
    UserService userService;
    ModelMapper modelMapper;
    FileService fileService;

    @Transactional
    public VehicleResponse registerVehicle(VehicleRegisterRequest request) {
        User currentUser = userService.getCurrentUser();
        
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
        
        if (driverProfile.getStatus() != DriverStatus.APPROVED) {
            throw new AppException(ErrorCode.DRIVER_NOT_APPROVED);
        }
        
        if (vehicleRepository.existsByDriver(driverProfile)) {
            throw new AppException(ErrorCode.VEHICLE_ALREADY_REGISTERED);
        }
        
        if (vehicleRepository.existsByPlateNumber(request.getPlateNumber())) {
            throw new AppException(ErrorCode.PLATE_NUMBER_ALREADY_USED);
        }
        
        if (request.getRegistrationExpiryDate().isBefore(LocalDate.now())) {
            throw new AppException(ErrorCode.REGISTRATION_EXPIRED);
        }
        
        if (request.getInsuranceExpiryDate().isBefore(LocalDate.now())) {
            throw new AppException(ErrorCode.INSURANCE_EXPIRED);
        }
        
        Vehicle vehicle = Vehicle.builder()
                .driver(driverProfile)
                .plateNumber(request.getPlateNumber())
                .vehicleBrand(request.getVehicleBrand())
                .vehicleModel(request.getVehicleModel())
                .vehicleYear(request.getVehicleYear())
                .vehicleColor(request.getVehicleColor())
                .seatCapacity(request.getSeatCapacity())
                .vehicleType(request.getVehicleType())
                .vehicleImage(fileService.upload(request.getVehicleImage(), "vehicles/images"))
                .registrationImage(fileService.upload(request.getRegistrationImage(), "vehicles/documents"))
                .registrationExpiryDate(request.getRegistrationExpiryDate())
                .insuranceImage(fileService.upload(request.getInsuranceImage(), "vehicles/documents"))
                .insuranceExpiryDate(request.getInsuranceExpiryDate())
                .isVerified(false)
                .isActive(true)
                .build();
        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle registered for driver {} with ID: {}", driverProfile.getId(), vehicle.getId());
        
        return mapToVehicleResponse(vehicle);
    }

    public VehicleResponse getMyVehicle() {
        User currentUser = userService.getCurrentUser();
        
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
        
        Vehicle vehicle = vehicleRepository.findByDriver(driverProfile)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
        
        return mapToVehicleResponse(vehicle);
    }

//    @Transactional
//    public VehicleResponse updateMyVehicle(VehicleUpdateRequest request) {
//        User currentUser = userService.getCurrentUser();
//
//        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
//                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
//
//        Vehicle vehicle = vehicleRepository.findByDriver(driverProfile)
//                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
//
//        // Update plate number if changed
//        if (request.getPlateNumber() != null && !request.getPlateNumber().equals(vehicle.getPlateNumber())) {
//            if (vehicleRepository.existsByPlateNumber(request.getPlateNumber())) {
//                throw new AppException(ErrorCode.PLATE_NUMBER_ALREADY_USED);
//            }
//            vehicle.setPlateNumber(request.getPlateNumber());
//            vehicle.setIsVerified(false); // Requires re-verification
//        }
//
//        // Update other fields if provided
//        if (request.getVehicleBrand() != null) {
//            vehicle.setVehicleBrand(request.getVehicleBrand());
//        }
//
//        if (request.getVehicleModel() != null) {
//            vehicle.setVehicleModel(request.getVehicleModel());
//        }
//
//        if (request.getVehicleYear() != null) {
//            vehicle.setVehicleYear(request.getVehicleYear());
//        }
//
//        if (request.getVehicleColor() != null) {
//            vehicle.setVehicleColor(request.getVehicleColor());
//        }
//
//        if (request.getSeatCapacity() != null) {
//            vehicle.setSeatCapacity(request.getSeatCapacity());
//        }
//
//        if (request.getVehicleType() != null) {
//            vehicle.setVehicleType(request.getVehicleType());
//        }
//
//        if (request.getVehicleImage() != null) {
//            vehicle.setVehicleImage(request.getVehicleImage());
//        }
//
//        if (request.getRegistrationImage() != null) {
//            vehicle.setRegistrationImage(request.getRegistrationImage());
//            vehicle.setIsVerified(false); // Requires re-verification
//        }
//
//        if (request.getRegistrationExpiryDate() != null) {
//            if (request.getRegistrationExpiryDate().isBefore(LocalDate.now())) {
//                throw new AppException(ErrorCode.REGISTRATION_EXPIRED);
//            }
//            vehicle.setRegistrationExpiryDate(request.getRegistrationExpiryDate());
//        }
//
//        if (request.getInsuranceImage() != null) {
//            vehicle.setInsuranceImage(request.getInsuranceImage());
//        }
//
//        if (request.getInsuranceExpiryDate() != null) {
//            if (request.getInsuranceExpiryDate().isBefore(LocalDate.now())) {
//                throw new AppException(ErrorCode.INSURANCE_EXPIRED);
//            }
//            vehicle.setInsuranceExpiryDate(request.getInsuranceExpiryDate());
//        }
//
//        vehicle = vehicleRepository.save(vehicle);
//
//        log.info("Vehicle {} updated by driver {}", vehicle.getId(), driverProfile.getId());
//
//        return mapToVehicleResponse(vehicle);
//    }
//
//    @Transactional
//    public VehicleResponse updateMyVehicleDocuments(VehicleDocumentsUpdateRequest request) {
//        User currentUser = userService.getCurrentUser();
//
//        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
//                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
//
//        Vehicle vehicle = vehicleRepository.findByDriver(driverProfile)
//                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));
//
//        boolean updated = false;
//
//        // Update registration documents
//        if (request.getRegistrationImage() != null) {
//            vehicle.setRegistrationImage(request.getRegistrationImage());
//            vehicle.setIsVerified(false); // Requires re-verification
//            updated = true;
//        }
//
//        if (request.getRegistrationExpiryDate() != null) {
//            if (request.getRegistrationExpiryDate().isBefore(LocalDate.now())) {
//                throw new AppException(ErrorCode.REGISTRATION_EXPIRED);
//            }
//            vehicle.setRegistrationExpiryDate(request.getRegistrationExpiryDate());
//            updated = true;
//        }
//
//        if (request.getInsuranceImage() != null) {
//            vehicle.setInsuranceImage(request.getInsuranceImage());
//            updated = true;
//        }
//
//        if (request.getInsuranceExpiryDate() != null) {
//            if (request.getInsuranceExpiryDate().isBefore(LocalDate.now())) {
//                throw new AppException(ErrorCode.INSURANCE_EXPIRED);
//            }
//            vehicle.setInsuranceExpiryDate(request.getInsuranceExpiryDate());
//            updated = true;
//        }
//
//        if (!updated) {
//            throw new AppException(ErrorCode.NO_DOCUMENT_TO_UPDATE);
//        }
//
//        vehicle = vehicleRepository.save(vehicle);
//
//        log.info("Vehicle {} documents updated by driver {}", vehicle.getId(), driverProfile.getId());
//
//        return mapToVehicleResponse(vehicle);
//    }

    @Transactional
    public void deleteMyVehicle() {
        User currentUser = userService.getCurrentUser();
        
        DriverProfile driverProfile = driverProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new AppException(ErrorCode.DRIVER_PROFILE_NOT_FOUND));
        
        Vehicle vehicle = vehicleRepository.findByDriver(driverProfile)
                .orElseThrow(() -> new AppException(ErrorCode.VEHICLE_NOT_FOUND));

        vehicleRepository.delete(vehicle);
        
        log.info("Vehicle {} deleted by driver {}", vehicle.getId(), driverProfile.getId());
    }

    private VehicleResponse mapToVehicleResponse(Vehicle vehicle) {
        VehicleResponse response = modelMapper.map(vehicle, VehicleResponse.class);
        DriverProfile driver = vehicle.getDriver();
        User user = driver.getUser();
        
        response.setDriverId(driver.getId());
        response.setDriverName(user.getFullName());
        response.setDriverPhone(user.getPhoneNumber());
        response.setDriverRating(driver.getDriverRating());
        
        return response;
    }
}
