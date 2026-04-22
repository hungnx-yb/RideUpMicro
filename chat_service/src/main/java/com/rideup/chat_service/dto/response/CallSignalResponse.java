package com.rideup.chat_service.dto.response;

import com.rideup.chat_service.enums.CallAction;
import com.rideup.chat_service.enums.CallStatus;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CallSignalResponse {
    CallAction action;
    String callId;
    String conversationId;
    String fromUserId;
    String toUserId;
    CallStatus status;
    String sdp;
    String candidate;
    LocalDateTime createdAt;
}
