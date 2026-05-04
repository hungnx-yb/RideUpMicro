package com.rideup.review_service.dto;

import lombok.Data;

@Data
public class DriverRatingStats {
    private String id; // Ánh xạ với _id trong MongoDB Group
    private double averageRating;
    private long totalReviews;
}
