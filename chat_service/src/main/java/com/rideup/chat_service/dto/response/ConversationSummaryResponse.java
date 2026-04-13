package com.rideup.chat_service.dto.response;

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
public class ConversationSummaryResponse {
    String id;
    String bookingId;
    String otherUserId;
    String otherUserName;
    String otherUserAvatar;
    String lastMessagePreview;
    String lastMessageSenderId;
    LocalDateTime lastMessageAt;
    LocalDateTime updatedAt;
    long unreadCount;
}
