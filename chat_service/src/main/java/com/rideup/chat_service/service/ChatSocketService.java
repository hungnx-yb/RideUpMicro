package com.rideup.chat_service.service;

import com.rideup.chat_service.dto.response.MessageResponse;
import com.rideup.chat_service.dto.response.ReadReceiptResponse;
import com.rideup.chat_service.model.Conversation;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ChatSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public ChatSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendMessageToParticipants(Conversation conversation, MessageResponse message) {
        if (conversation.getParticipants() == null) {
            return;
        }
        for (String participant : conversation.getParticipants()) {
            messagingTemplate.convertAndSendToUser(participant, "/queue/messages", message);
        }
    }

    public void sendReadReceiptToParticipants(Conversation conversation, ReadReceiptResponse receipt, String excludeUserId) {
        if (conversation.getParticipants() == null) {
            return;
        }
        for (String participant : conversation.getParticipants()) {
            if (participant != null && participant.equals(excludeUserId)) {
                continue;
            }
            messagingTemplate.convertAndSendToUser(participant, "/queue/read", receipt);
        }
    }
}
