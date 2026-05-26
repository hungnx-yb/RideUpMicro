package com.rideup.review_service.dto;

import lombok.Data;

@Data
public class DriverRatingStats {
    private String id;
    private double averageRating;
    private long totalReviews;
}
