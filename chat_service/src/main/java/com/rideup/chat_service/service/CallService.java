package com.rideup.chat_service.service;

import com.rideup.chat_service.enums.CallStatus;
import com.rideup.chat_service.model.CallSession;
import com.rideup.chat_service.repository.CallSessionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallService {

    CallSessionRepository callRepo;
    SimpMessagingTemplate messagingTemplate;

    public CallSession startCall(String conversationId, String callerId, String calleeId) {

        CallSession call = CallSession.builder()
                .conversationId(conversationId)
                .callerId(callerId)
                .calleeId(calleeId)
                .status(CallStatus.RINGING)
                .startedAt(LocalDateTime.now())
                .build();
        callRepo.save(call);
        messagingTemplate.convertAndSend(
                "/topic/call/" + calleeId,
                call
        );
        return call;
    }

    public CallSession acceptCall(String callId) {
        CallSession call = callRepo.findById(callId).orElseThrow();
        call.setStatus(CallStatus.ACCEPTED);
        callRepo.save(call);
        messagingTemplate.convertAndSend(
                "/topic/call/" + call.getCallerId(),
                call
        );
        return call;
    }

    public CallSession endCall(String callId) {
        CallSession call = callRepo.findById(callId).orElseThrow();

        call.setStatus(CallStatus.ENDED);
        call.setEndedAt(LocalDateTime.now());
        callRepo.save(call);
        messagingTemplate.convertAndSend(
                "/topic/call/" + call.getCallerId(),
                call
        );
        messagingTemplate.convertAndSend(
                "/topic/call/" + call.getCalleeId(),
                call
        );
        return call;
    }
}