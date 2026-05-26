package com.rideup.review_service.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReviewRequest {
    @NotBlank(message = "Trip ID cannot be empty")
    private String tripId;
    
    @NotBlank(message = "Driver ID cannot be empty")
    private String driverId;

    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private int rating;
    
    private String comment;
}
