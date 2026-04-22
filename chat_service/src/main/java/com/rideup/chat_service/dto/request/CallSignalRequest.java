package com.rideup.chat_service.dto.request;

import com.rideup.chat_service.enums.CallAction;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CallSignalRequest {
    CallAction action;
    String callId;
    String conversationId;
    String targetUserId;
    String sdp;
    String candidate;
}
