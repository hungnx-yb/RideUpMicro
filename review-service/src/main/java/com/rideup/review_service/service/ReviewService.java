package com.rideup.review_service.service;

import com.rideup.review_service.dto.DriverRatingStats;
import com.rideup.review_service.dto.event.DriverRatingUpdatedEvent;
import com.rideup.review_service.dto.request.CreateReviewRequest;
import com.rideup.review_service.dto.response.ReviewResponse;
import com.rideup.review_service.entity.Review;
import com.rideup.review_service.kafka.producer.ReviewServicePublisher;
import com.rideup.review_service.repository.ReviewRepository;
import com.rideup.review_service.utils.SecurityUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewService {
    ReviewRepository reviewRepository;
    ReviewServicePublisher reviewServicePublisher;
    ModelMapper modelMapper;
    public ReviewResponse createReview(CreateReviewRequest request) {
        String customerId = SecurityUtils.getCurrentUserId();
        log.info("Creating review for trip: {} by customer: {}", request.getTripId(), customerId);

        Review review = modelMapper.map(request, Review.class);
        review.setCustomerId(customerId);
        Review savedReview = reviewRepository.save(review);
        updateDriverRating(savedReview.getDriverId());
        return modelMapper.map(savedReview,  ReviewResponse.class);
    }

    private void updateDriverRating(String driverId) {
        DriverRatingStats stats = reviewRepository.getRatingStatsByDriverId(driverId);
        long v = (stats != null) ? stats.getTotalReviews() : 0;
        double R = (stats != null) ? stats.getAverageRating() : 5.0;
        long W = 5;
        double C = 5.0;
        double bayesianAverage = ((W * C) + (R * v)) / (W + v);
        bayesianAverage = Math.round(bayesianAverage * 10.0) / 10.0;
        log.info("Calculated Bayesian rating for driver {}: {} (Actual Average: {}, Total Reviews: {})",
                driverId, bayesianAverage, Math.round(R * 10.0) / 10.0, v);
        DriverRatingUpdatedEvent event = DriverRatingUpdatedEvent.builder()
                .driverId(driverId)
                .averageRating(bayesianAverage)
                .build();
        reviewServicePublisher.publishDriverRatingUpdated(event);
    }

    public List<ReviewResponse> getDriverReviews(String driverId) {
        return reviewRepository.findByDriverId(driverId).stream()
                .map(x->modelMapper.map(x, ReviewResponse.class))
                .collect(Collectors.toList());
    }

}
