package com.rideup.review_service.controller;

import com.rideup.review_service.dto.request.CreateReviewRequest;
import com.rideup.review_service.dto.response.ApiResponse;
import com.rideup.review_service.dto.response.ReviewResponse;
import com.rideup.review_service.service.ReviewService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewController {

    ReviewService reviewService;

    @PostMapping
    public ApiResponse<ReviewResponse> createReview(@Valid @RequestBody CreateReviewRequest request) {
        return ApiResponse.<ReviewResponse>builder()
                .result(reviewService.createReview(request))
                .message("Review created successfully")
                .build();
    }

    @GetMapping("/driver/{driverId}")
    public ApiResponse<List<ReviewResponse>> getDriverReviews(@PathVariable String driverId) {
        List<ReviewResponse> reviews = reviewService.getDriverReviews(driverId);
        return ApiResponse.<List<ReviewResponse>>builder()
                .result(reviews)
                .count((long) reviews.size())
                .message("Driver reviews retrieved successfully")
                .build();
    }
}
