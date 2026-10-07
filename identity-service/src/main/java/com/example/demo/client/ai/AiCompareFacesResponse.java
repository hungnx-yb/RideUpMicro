package com.example.demo.client.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiCompareFacesResponse {
    String status;

    @JsonProperty("is_real")
    Boolean isReal;

    @JsonProperty("is_matched")
    Boolean isMatched;

    Double similarity;

    Double threshold;

    String message;
}
