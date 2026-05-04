package com.rideup.review_service.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "reviews")
public class Review {
    @Id
    String id;

    String tripId;
    String driverId;
    String customerId;

    int rating;
    String comment;

    @CreatedDate
    LocalDateTime createdAt;
}