package com.rideup.chat_service.repository;

import com.rideup.chat_service.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;

public interface MessageRepository extends MongoRepository<Message, String> {
    Page<Message> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);

    long countByConversationIdAndCreatedAtAfterAndSenderIdNot(
            String conversationId,
            LocalDateTime createdAt,
            String senderId
    );

    void deleteByConversationId(String conversationId);
}
