package com.rideup.chat_service.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "conversations")
public class Conversation {
    @Id
    String id;

    @Indexed
    List<String> participants;

    @Indexed(unique = true)
    String bookingId;

    String lastMessagePreview;
    String lastMessageSenderId;

    LocalDateTime lastMessageAt;
    @CreatedDate
    LocalDateTime createdAt;
    @LastModifiedDate
    @Indexed
    LocalDateTime updatedAt;
}