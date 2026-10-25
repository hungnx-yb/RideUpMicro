package com.example.demo.dto.response.driver;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DriverFaceCompareResponse {
    Boolean isMatched;
    Boolean isReal;
    Double similarity;
    Double threshold;
    String message;
}
