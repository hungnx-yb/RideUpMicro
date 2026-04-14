package com.rideup.chat_service.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConversationResponse {
    String id;
    String bookingId;
    List<String> participants;
    UserResponse otherUser;
    String lastMessagePreview;
    String lastMessageSenderId;
    LocalDateTime lastMessageAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
