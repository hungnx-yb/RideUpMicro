package com.example.demo.repository;

import com.example.demo.entity.DriverProfile;
import com.example.demo.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {
    Optional<Vehicle> findByDriver(DriverProfile driver);
    Optional<Vehicle> findByDriverId(String driverId);
    boolean existsByDriver(DriverProfile driver);
    boolean existsByPlateNumber(String plateNumber);
    Optional<Vehicle> findByPlateNumber(String plateNumber);
}
