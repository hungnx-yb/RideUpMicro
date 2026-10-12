package com.rideup.trip_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MarketplaceTripRequestFilter {

    @NotBlank(message = "START_PROVINCE_REQUIRED")
    String startProvinceId;

    @NotBlank(message = "END_PROVINCE_REQUIRED")
    String endProvinceId;

    String startWardId;
    String endWardId;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    LocalDateTime fromTime;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    LocalDateTime toTime;

    Integer minSeat;
}
