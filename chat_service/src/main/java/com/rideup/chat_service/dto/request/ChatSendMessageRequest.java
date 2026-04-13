package com.rideup.chat_service.dto.request;

import com.rideup.chat_service.enums.MessageType;
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
public class ChatSendMessageRequest {
    String conversationId;
    MessageType type;
    String content;
    String mediaUrl;
}
