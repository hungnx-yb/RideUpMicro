package com.example.demo.dto.response.driver;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverReputationResponse {
    Integer reputationScore;
    Integer totalDriverRides;
    Double driverRating;
}
