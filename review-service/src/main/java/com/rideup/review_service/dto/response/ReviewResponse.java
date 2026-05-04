package com.rideup.review_service.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private String id;
    private String tripId;
    private String driverId;
    private String customerId;
    private int rating;
    private String comment;
    private LocalDateTime createdAt;
}
