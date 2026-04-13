package com.rideup.chat_service.repository;

import com.rideup.chat_service.model.ConversationMember;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationMemberRepository extends MongoRepository<ConversationMember, String> {
    Optional<ConversationMember> findByConversationIdAndUserId(String conversationId, String userId);

    List<ConversationMember> findByConversationId(String conversationId);

    long deleteByConversationIdAndUserId(String conversationId, String userId);
}
