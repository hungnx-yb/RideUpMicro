package com.example.demo.client.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiCompareFacesRequest {
    @JsonProperty("image1_base64")
    String image1Base64;

    @JsonProperty("image2_base64")
    String image2Base64;

    @Builder.Default
    Double threshold = 0.65;

    @JsonProperty("check_liveness")
    @Builder.Default
    Boolean checkLiveness = true;
}
