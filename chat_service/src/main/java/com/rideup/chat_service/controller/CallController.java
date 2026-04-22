package com.rideup.chat_service.controller;

import com.rideup.chat_service.dto.request.CallSignalRequest;
import com.rideup.chat_service.service.CallService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallController {

    CallService callService;

    @MessageMapping("/call.signal")
    public void handleCallSignal(@Payload CallSignalRequest request, Principal principal) {
        String userId = principal == null ? null : principal.getName();
        if (userId == null || userId.isBlank()) {
            return;
        }
        callService.handleSignal(request, userId);
    }
}
