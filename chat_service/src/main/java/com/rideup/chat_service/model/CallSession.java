package com.rideup.chat_service.model;

import com.rideup.chat_service.enums.CallStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@FieldDefaults(level = AccessLevel.PRIVATE)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "call_sessions")
public class CallSession {

    @Id
    String id;

    String conversationId;

    String callerId;
    String calleeId;

    CallStatus status;

    LocalDateTime startedAt;
    LocalDateTime endedAt;
}