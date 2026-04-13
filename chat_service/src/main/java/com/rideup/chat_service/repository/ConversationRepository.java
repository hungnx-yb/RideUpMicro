package com.rideup.chat_service.repository;

import com.rideup.chat_service.model.Conversation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends MongoRepository<Conversation, String> {
    Optional<Conversation> findByBookingId(String bookingId);

    List<Conversation> findByParticipantsContainingOrderByUpdatedAtDesc(String userId);
}
