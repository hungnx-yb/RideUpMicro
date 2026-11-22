package com.rideup.review_service.service;

import com.rideup.review_service.dto.DriverRatingStats;
import com.rideup.review_service.dto.event.DriverRatingUpdatedEvent;
import com.rideup.review_service.dto.request.CreateReviewRequest;
import com.rideup.review_service.dto.response.ReviewResponse;
import com.rideup.review_service.entity.Review;
import com.rideup.review_service.exception.AppException;
import com.rideup.review_service.exception.ErrorCode;
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
        log.info("Creating review for booking: {} trip: {} by customer: {}", request.getBookingId(), request.getTripId(), customerId);

        if (request.getBookingId() != null && !request.getBookingId().isBlank()) {
            if (reviewRepository.existsByBookingId(request.getBookingId())) {
                log.warn("Booking {} has already been reviewed", request.getBookingId());
                throw new AppException(ErrorCode.REVIEW_ALREADY_EXISTS);
            }
        }

        Review review = modelMapper.map(request, Review.class);
        review.setCustomerId(customerId);
        review.setCreatedAt(LocalDateTime.now());
        Review savedReview = reviewRepository.save(review);
        updateDriverRating(savedReview.getDriverId());
        return modelMapper.map(savedReview, ReviewResponse.class);
    }

    public ReviewResponse getReviewByBookingId(String bookingId) {
        return reviewRepository.findByBookingId(bookingId)
                .map(x -> modelMapper.map(x, ReviewResponse.class))
                .orElse(null);
    }

    private void updateDriverRating(String driverId) {
        DriverRatingStats stats = reviewRepository.getRatingStatsByDriverId(driverId);
        long v = (stats != null) ? stats.getTotalReviews() : 0;
        double actualAverage = (stats != null && v > 0) ? stats.getAverageRating() : 5.0;
        double roundedRating = Math.round(actualAverage * 10.0) / 10.0;
        log.info("Calculated actual average rating for driver {}: {} (Total Reviews: {})",
                driverId, roundedRating, v);
        DriverRatingUpdatedEvent event = DriverRatingUpdatedEvent.builder()
                .driverId(driverId)
                .averageRating(roundedRating)
                .build();
        reviewServicePublisher.publishDriverRatingUpdated(event);
    }

    public List<ReviewResponse> getDriverReviews(String driverId) {
        return reviewRepository.findByDriverId(driverId).stream()
                .map(x->modelMapper.map(x, ReviewResponse.class))
                .collect(Collectors.toList());
    }

}
