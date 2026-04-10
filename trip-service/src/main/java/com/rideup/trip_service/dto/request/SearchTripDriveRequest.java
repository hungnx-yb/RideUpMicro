package com.rideup.trip_service.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SearchTripDriveRequest {
    LocalDate startDate;
    LocalDate endDate;
    String startProvinceId;
    String endProvinceId;
    Pageable pageable;

}
