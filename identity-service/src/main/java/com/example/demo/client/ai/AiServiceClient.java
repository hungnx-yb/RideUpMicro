package com.example.demo.client.ai;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "ai-service", path = "/api/ai")
public interface AiServiceClient {

    @GetMapping("/health")
    Map<String, Object> checkHealth();

    @PostMapping("/extract-embedding")
    AiExtractEmbeddingResponse extractEmbedding(@RequestBody AiExtractEmbeddingRequest request);

    @PostMapping("/verify-driver")
    AiVerifyDriverResponse verifyDriver(@RequestBody AiVerifyDriverRequest request);

    @PostMapping("/compare-faces")
    AiCompareFacesResponse compareFaces(@RequestBody AiCompareFacesRequest request);
}
