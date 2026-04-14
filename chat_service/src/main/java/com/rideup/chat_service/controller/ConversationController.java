package com.rideup.chat_service.controller;

import com.rideup.chat_service.dto.response.*;
import com.rideup.chat_service.service.ConversationService;
import com.rideup.chat_service.service.MessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;

import java.util.List;

@RestController
@RequestMapping("/conversations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConversationController {
    ConversationService conversationService;
    MessageService messageService;
    private final HandlerMapping resourceHandlerMapping;


    @PostMapping("/booking/{bookingId}")
    public ApiResponse<ConversationResponse> createConversation(@PathVariable String bookingId) {
        ConversationResponse response = conversationService.createOrGetByBookingId(bookingId);
        return ApiResponse.<ConversationResponse>builder()
                .message("Conversation ready")
                .result(response)
                .build();
    }

    @GetMapping("/booking/{bookingId}")
    public ApiResponse<ConversationResponse> getConversationByBooking(@PathVariable String bookingId) {
        ConversationResponse response = conversationService.getByBookingId(bookingId);
        return ApiResponse.<ConversationResponse>builder()
                .message("Conversation retrieved successfully")
                .result(response)
                .build();
    }



    @DeleteMapping("/{conversationId}")
    public ApiResponse<Void> deleteConversation(@PathVariable String conversationId) {
        conversationService.deleteConversation(conversationId);
        return ApiResponse.<Void>builder()
                .message("Conversation deleted")
                .build();
    }

    @PostMapping("/{conversationId}/read")
    public ApiResponse<ReadReceiptResponse> markRead(@PathVariable String conversationId) {
        ReadReceiptResponse response = conversationService.markRead(conversationId);
        return ApiResponse.<ReadReceiptResponse>builder()
                .message("Conversation marked as read")
                .result(response)
                .build();
    }

        @GetMapping("/{conversationId}/messages")
        public ApiResponse<List<MessageResponse>> listMessages(
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
        ) {
        Page<MessageResponse> result = messageService.listMessages(conversationId, page, size);
        return ApiResponse.<List<MessageResponse>>builder()
                .result(result.getContent())
                .count(result.getTotalElements())
                .build();
        }
}
