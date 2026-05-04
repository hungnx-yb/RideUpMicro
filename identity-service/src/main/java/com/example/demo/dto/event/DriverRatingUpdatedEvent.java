package com.example.demo.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverRatingUpdatedEvent {
    String driverId;
    double averageRating;
}
