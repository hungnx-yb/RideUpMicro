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
public class AiExtractEmbeddingResponse {
    String status;

    @JsonProperty("is_real")
    Boolean isReal;

    @JsonProperty("liveness_score")
    Double livenessScore;

    List<Double> embedding;

    String message;
}
