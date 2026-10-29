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
    String pickupAddress;
    String dropoffAddress;
    String status;
    Integer page;
    Integer size;
    Pageable pageable;

    public Pageable getPageable() {
        if (this.pageable != null) {
            return this.pageable;
        }
        if (this.page != null && this.size != null) {
            return org.springframework.data.domain.PageRequest.of(this.page, this.size);
        }
        return null;
    }
}
