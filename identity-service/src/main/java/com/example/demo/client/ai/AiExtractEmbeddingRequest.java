package com.example.demo.client.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiExtractEmbeddingRequest {
    @JsonProperty("image_base64")
    String imageBase64;

    @JsonProperty("check_liveness")
    @Builder.Default
    Boolean checkLiveness = true;
}
