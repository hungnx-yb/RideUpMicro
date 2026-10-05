package com.example.demo.dto.request.user;

import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OperatingProvincesRequest {
    @Size(max = 5, message = "DRIVER_OPERATING_PROVINCES_EXCEED_LIMIT")
    List<String> operatingProvinceIds;
}
