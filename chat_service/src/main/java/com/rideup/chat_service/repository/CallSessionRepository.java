package com.rideup.chat_service.repository;

import com.rideup.chat_service.model.CallSession;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CallSessionRepository extends MongoRepository<CallSession, String> {
}