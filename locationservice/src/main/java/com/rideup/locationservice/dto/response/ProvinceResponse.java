package com.rideup.locationservice.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.Column;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProvinceResponse {
    String id;

    String name;

    String code;

    BigDecimal lat;

    BigDecimal lng;

    Long osmId;

}
