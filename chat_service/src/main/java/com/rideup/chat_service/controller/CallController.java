package com.rideup.chat_service.controller;
import com.rideup.chat_service.model.CallSession;
import com.rideup.chat_service.service.CallService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    @PostMapping("/start")
    public CallSession startCall(
            @RequestParam String conversationId,
            @RequestParam String callerId,
            @RequestParam String calleeId
    ) {
        return callService.startCall(conversationId, callerId, calleeId);
    }

    @PostMapping("/{callId}/accept")
    public CallSession acceptCall(@PathVariable String callId) {
        return callService.acceptCall(callId);
    }

    @PostMapping("/{callId}/end")
    public CallSession endCall(@PathVariable String callId) {
        return callService.endCall(callId);
    }

}