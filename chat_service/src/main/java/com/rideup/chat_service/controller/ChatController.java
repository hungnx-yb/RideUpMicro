package com.rideup.chat_service.controller;

import com.rideup.chat_service.dto.request.ChatReadRequest;
import com.rideup.chat_service.dto.request.ChatSendMessageRequest;
import com.rideup.chat_service.dto.response.MessageResponse;
import com.rideup.chat_service.dto.response.ReadReceiptResponse;
import com.rideup.chat_service.service.ConversationService;
import com.rideup.chat_service.service.MessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatController {
    MessageService messageService;
    ConversationService conversationService;

    @MessageMapping("/chat.send")
    public MessageResponse sendMessage(ChatSendMessageRequest request, Principal principal) {
        return messageService.sendMessage(request, principal);
    }

    @MessageMapping("/chat.read")
    public ReadReceiptResponse markRead(ChatReadRequest request) {
        return conversationService.markRead(request.getConversationId());
    }
}
