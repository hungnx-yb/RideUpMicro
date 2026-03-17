package com.example.demo.entity;

import com.example.demo.enums.VehicleType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    // Biển số xe
    String plateNumber;

    // Hãng xe (Toyota, Honda...)
    String vehicleBrand;

    // Dòng xe (Vios, City...)
    String vehicleModel;

    // Năm sản xuất
    Integer vehicleYear;

    // Màu xe
    String vehicleColor;

    // Số ghế
    Integer seatCapacity;

    // Loại xe
    @Enumerated(EnumType.STRING)
    VehicleType vehicleType;

    // Ảnh xe
    String vehicleImage;

    // Ảnh đăng ký xe
    String registrationImage;

    // Ngày hết hạn đăng ký xe
    LocalDate registrationExpiryDate;

    // Ảnh bảo hiểm xe
    String insuranceImage;

    // Ngày hết hạn bảo hiểm xe
    LocalDate insuranceExpiryDate;

    // Trạng thái xác minh
    @Builder.Default
    Boolean isVerified = false;
    // Trạng thái hoạt động
    Boolean isActive;

    // Thời điểm duyệt
    LocalDateTime approvedAt;

    // Admin duyệt
    String approvedBy;

    // Thời điểm từ chối
    LocalDateTime rejectedAt;

    // Lý do từ chối
    String rejectionReason;

    // Tài xế sở hữu xe (1-1)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false, unique = true)
    DriverProfile driver;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}

