package com.rideup.chat_service.controller;

import com.rideup.chat_service.dto.request.CallSignalRequest;
import com.rideup.chat_service.service.CallService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallController {

    CallService callService;

    @MessageMapping("/call.signal")
    public void handleCallSignal(CallSignalRequest request, Principal principal) {
        String userId = principal == null ? null : principal.getName();
        log.info("Received call signal: action={}, fromUser={}, callId={}", 
            request.getAction(), userId, request.getCallId());
            
        if (userId == null || userId.isBlank()) {
            log.warn("Unauthorized call signal attempt (principal is null)");
            return;
        }
        callService.handleSignal(request, userId);
    }
}
