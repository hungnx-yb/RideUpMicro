package com.rideup.chat_service.service;
import com.rideup.chat_service.constant.RedisKeyTTL;
import com.rideup.chat_service.dto.request.CallSignalRequest;
import com.rideup.chat_service.dto.response.CallSignalErrorResponse;
import com.rideup.chat_service.dto.response.CallSignalResponse;
import com.rideup.chat_service.enums.CallAction;
import com.rideup.chat_service.enums.CallStatus;
import com.rideup.chat_service.exception.AppException;
import com.rideup.chat_service.exception.ErrorCode;
import com.rideup.chat_service.model.CallSession;
import com.rideup.chat_service.model.Conversation;
import com.rideup.chat_service.repository.CallSessionRepository;
import com.rideup.chat_service.repository.ConversationRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CallService {
    CallSessionRepository callSessionRepository;
    ConversationRepository conversationRepository;
    CallStateStore callStateStore;
    SimpMessagingTemplate messagingTemplate;
    ModelMapper modelMapper;


    public void handleSignal(CallSignalRequest request, String userId) {
        if (request == null || request.getAction() == null) {
            sendError(userId, null, null, ErrorCode.CALL_INVALID_STATE);
            return;
        }
        try {
            switch (request.getAction()) {
                case CALL_INIT -> handleInit(request, userId);
                case CALL_ACCEPT -> acceptCall(request.getCallId(), userId);
                case CALL_REJECT -> rejectCall(request.getCallId(), userId);
                case CALL_CANCEL -> cancelCall(request.getCallId(), userId);
                case CALL_END -> endCall(request.getCallId(), userId);
                case SDP_OFFER, SDP_ANSWER, ICE_CANDIDATE -> relaySignal(request, userId);
                default -> sendError(userId, request.getAction(), request.getCallId(), ErrorCode.CALL_INVALID_STATE);
            }
        } catch (AppException ex) {
            sendError(userId, request.getAction(), request.getCallId(), ex.getErrorCode());
        }
    }

    private void handleInit(CallSignalRequest request, String callerId) {
        if (request.getConversationId() == null || request.getConversationId().isBlank()) {
            throw new AppException(ErrorCode.CALL_CONVERSATION_NOT_FOUND);
        }

        Conversation conversation = conversationRepository.findById(request.getConversationId())
                .orElseThrow(() -> new AppException(ErrorCode.CALL_CONVERSATION_NOT_FOUND));
        if( !conversation.getParticipants().contains(callerId)|| !conversation.getParticipants().contains(request.getTargetUserId()) ) {
            throw new AppException(ErrorCode.CALL_FORBIDDEN);
        }

        ensureNoActiveCall(callerId);
        ensureNoActiveCall(request.getTargetUserId());
        CallSession call  = modelMapper.map(request, CallSession.class);
        call.setCalleeId(request.getTargetUserId());
        call.setCallerId(callerId);
        call.setStatus(CallStatus.RINGING);
        CallSession callSave =  callSessionRepository.save(call);
        callStateStore.saveState(callSave, RedisKeyTTL.RINGING_TTL);
        callStateStore.setActiveCallId(callerId, call.getId(),RedisKeyTTL.ACTIVE_CALL_TTL);
        callStateStore.setActiveCallId(request.getTargetUserId(), call.getId(), RedisKeyTTL.ACTIVE_CALL_TTL);
        CallSignalResponse response = buildResponse(CallAction.CALL_RINGING, call, callerId, null, null);
        sendToUser(request.getTargetUserId(), response);
        sendToUser(callerId, response);
    }

    public CallSession acceptCall(String callId, String userId) {
        CallSession state = callStateStore.getState(callId);
        if (state == null) {
            throw new AppException(ErrorCode.CALL_NOT_FOUND);
        }
        if (!userId.equals(state.getCalleeId())) {
            throw new AppException(ErrorCode.CALL_FORBIDDEN);
        }
        if (state.getStatus() != CallStatus.RINGING) {
            throw new AppException(ErrorCode.CALL_INVALID_STATE);
        }

        state.setStatus(CallStatus.ACCEPTED);
        state.setStartedAt(LocalDateTime.now());
        callStateStore.saveState(state, RedisKeyTTL.ACTIVE_CALL_TTL);
        callStateStore.setActiveCallId(state.getCallerId(), callId, RedisKeyTTL.ACTIVE_CALL_TTL);
        callStateStore.setActiveCallId(state.getCalleeId(), callId, RedisKeyTTL.ACTIVE_CALL_TTL);
        CallSession call = callSessionRepository.findById(callId).orElseThrow(() -> new AppException(ErrorCode.CALL_NOT_FOUND));
        call.setStatus(CallStatus.ACCEPTED);
        callSessionRepository.save(call);

        CallSignalResponse response = buildResponse(CallAction.CALL_ACCEPT, state, userId, null, null);
        sendToUser(state.getCallerId(), response);
        sendToUser(state.getCalleeId(), response);
        return call;
    }

        public CallSession endCall(String callId, String userId) {
                return finishCall(callId, userId, CallAction.CALL_END, CallStatus.ENDED);
        }

        public CallSession rejectCall(String callId, String userId) {
                return finishCall(callId, userId, CallAction.CALL_REJECT, CallStatus.REJECTED);
        }

        public CallSession cancelCall(String callId, String userId) {
                return finishCall(callId, userId, CallAction.CALL_CANCEL, CallStatus.CANCELLED);
        }


        private void relaySignal(CallSignalRequest request, String userId) {
                CallSession state = callStateStore.getState(request.getCallId());
                if (state == null) {
                throw new AppException(ErrorCode.CALL_NOT_FOUND);
                }
                if (state.getStatus() != CallStatus.ACCEPTED) {
                        throw new AppException(ErrorCode.CALL_INVALID_STATE);
                }

                String targetUserId = userId.equals(state.getCallerId()) ? state.getCalleeId() : state.getCallerId();
                CallSignalResponse response = buildResponse(request.getAction(), state, userId, request.getSdp(), request.getCandidate());
                sendToUser(targetUserId, response);
        }

        private CallSession finishCall(String callId, String userId, CallAction action, CallStatus status) {
            CallSession state = callStateStore.getState(callId);
            if (state == null) {
                throw new AppException(ErrorCode.CALL_NOT_FOUND);
            }
                if (state.getStatus() == CallStatus.ENDED || state.getStatus() == CallStatus.REJECTED || state.getStatus() == CallStatus.CANCELLED) {
                        throw new AppException(ErrorCode.CALL_INVALID_STATE);
                }
                state.setStatus(status);
                state.setEndedAt(LocalDateTime.now());
                callStateStore.deleteState(callId);
                callStateStore.clearActiveCallId(state.getCallerId(), callId);
                callStateStore.clearActiveCallId(state.getCalleeId(), callId);
                CallSession call = callSessionRepository.findById(callId).orElseThrow(() -> new AppException(ErrorCode.CALL_NOT_FOUND));
                call.setStatus(status);
                call.setEndedAt(state.getEndedAt());
                callSessionRepository.save(call);
                CallSignalResponse response = buildResponse(action, state, userId, null, null);
                sendToUser(state.getCallerId(), response);
                sendToUser(state.getCalleeId(), response);
                return call;
        }

        private void ensureNoActiveCall(String userId) {
                String activeCallId = callStateStore.getActiveCallId(userId);
                if (activeCallId == null) {
                        return;
                }
                CallSession activeState = callStateStore.getState(activeCallId);
                if (activeState == null) {
                        callStateStore.clearActiveCallId(userId, activeCallId);
                        return;
                }
                if (activeState.getStatus() != CallStatus.ENDED) {
                        throw new AppException(ErrorCode.CALL_ALREADY_ACTIVE);
                }
        }

        private void sendToUser(String userId, CallSignalResponse response) {
                messagingTemplate.convertAndSendToUser(userId, "/queue/call", response);
        }

        private void sendError(String userId, CallAction action, String callId, ErrorCode errorCode) {
                CallSignalErrorResponse error = CallSignalErrorResponse.builder()
                                .action(action)
                                .callId(callId)
                                .code(errorCode.getCode())
                                .message(errorCode.getMessage())
                                .createdAt(LocalDateTime.now())
                                .build();
                messagingTemplate.convertAndSendToUser(userId, "/queue/call-errors", error);
        }

        private CallSignalResponse buildResponse(CallAction action, CallSession state, String fromUserId, String sdp, String candidate) {
                return CallSignalResponse.builder()
                                .action(action)
                                .callId(state.getId())
                                .conversationId(state.getConversationId())
                                .fromUserId(fromUserId)
                                .toUserId(fromUserId == null ? null : (fromUserId.equals(state.getCallerId()) ? state.getCalleeId() : state.getCallerId()))
                                .status(state.getStatus())
                                .sdp(sdp)
                                .candidate(candidate)
                                .createdAt(LocalDateTime.now())
                                .build();
        }
}