package com.example.demo.client.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiVerifyDriverRequest {
    @JsonProperty("image_base64")
    String imageBase64;

    @JsonProperty("target_embedding")
    List<Double> targetEmbedding;

    Double threshold;
}
