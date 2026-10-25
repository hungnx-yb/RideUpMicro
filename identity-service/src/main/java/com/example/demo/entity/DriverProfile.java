package com.example.demo.entity;

import com.example.demo.enums.DriverStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;
    String cccd;
    String cccdImageFront;
    String cccdImageBack;
    String portraitImage;
    String gplx;
    LocalDate gplxIssueDate;
    LocalDate gplxExpiryDate;
    String gplxIssuePlace;
    String gplxImageFront;
    String gplxImageBack;

    @Column(name = "gplx_class")
    String gplxClasses;
    Double driverRating;
    Integer totalDriverRides;
    @Enumerated(EnumType.STRING)
    DriverStatus status;
    LocalDateTime approvedAt;
    String approvedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @Column(name = "system_debt", precision = 15, scale = 2)
    @Builder.Default
    java.math.BigDecimal systemDebt = java.math.BigDecimal.ZERO;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @Column(name = "operating_provinces", columnDefinition = "json")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    List<String> operatingProvinceIds = new ArrayList<>();

    // Sinh trắc học khuôn mặt AI
    @Lob
    @Column(name = "face_embedding", columnDefinition = "TEXT")
    String faceEmbedding;

    @Column(name = "is_face_enrolled")
    @Builder.Default
    Boolean isFaceEnrolled = false;

    @Column(name = "last_face_verified_at")
    LocalDateTime lastFaceVerifiedAt;

    @Column(name = "face_match_score")
    Double faceMatchScore;

    // User liên kết (1-1)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    User user;

    // Xe của tài xế (1-1)
    @OneToOne(mappedBy = "driver", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Vehicle vehicle;

    public LocalDate getGplxIssueDate() {
        return gplxIssueDate;
    }

    public void setGplxIssueDate(LocalDate gplxIssueDate) {
        this.gplxIssueDate = gplxIssueDate;
    }

    public String getGplxIssuePlace() {
        return gplxIssuePlace;
    }

    public void setGplxIssuePlace(String gplxIssuePlace) {
        this.gplxIssuePlace = gplxIssuePlace;
    }
}
