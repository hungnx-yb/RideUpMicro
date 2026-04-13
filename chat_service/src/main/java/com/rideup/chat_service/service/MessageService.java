package com.rideup.chat_service.service;

import com.rideup.chat_service.dto.request.ChatSendMessageRequest;
import com.rideup.chat_service.dto.response.MessageResponse;
import com.rideup.chat_service.enums.MessageType;
import com.rideup.chat_service.exception.AppException;
import com.rideup.chat_service.exception.ErrorCode;
import com.rideup.chat_service.model.Conversation;
import com.rideup.chat_service.model.Message;
import com.rideup.chat_service.repository.ConversationRepository;
import com.rideup.chat_service.repository.MessageRepository;
import com.rideup.chat_service.utils.SecurityUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MessageService {

	ConversationRepository conversationRepository;
	MessageRepository messageRepository;
	ChatSocketService chatSocketService;
	ModelMapper modelMapper;

	public MessageResponse sendMessage(ChatSendMessageRequest request, Principal principal) {
		String currentUserId = principal.getName();
		if (request == null || request.getConversationId() == null || request.getConversationId().isBlank()) {
			throw new AppException(ErrorCode.CHAT_MESSAGE_INVALID);
		}

		Conversation conversation = conversationRepository.findById(request.getConversationId())
				.orElseThrow(() -> new AppException(ErrorCode.CHAT_CONVERSATION_NOT_FOUND));
		ensureParticipant(conversation, currentUserId);

		MessageType type = request.getType() == null ? MessageType.TEXT : request.getType();
		if (!isValidMessage(type, request)) {
			throw new AppException(ErrorCode.CHAT_MESSAGE_INVALID);
		}

		Message message = new Message();
		message.setConversationId(request.getConversationId());
		message.setSenderId(currentUserId);
		message.setType(type);
		message.setContent(request.getContent());
		message.setMediaUrl(request.getMediaUrl());
		Message saved = messageRepository.save(message);

		conversation.setLastMessagePreview(buildPreview(type, request));
		conversation.setLastMessageSenderId(currentUserId);
		conversation.setLastMessageAt(LocalDateTime.now());
		conversationRepository.save(conversation);

		MessageResponse response = modelMapper.map(saved, MessageResponse.class);
		chatSocketService.sendMessageToParticipants(conversation, response);
		return response;
	}

	public Page<MessageResponse> listMessages(String conversationId, int page, int size) {
		String currentUserId = SecurityUtils.getCurrentUserId();

		Conversation conversation = conversationRepository.findById(conversationId)
				.orElseThrow(() -> new AppException(ErrorCode.CHAT_CONVERSATION_NOT_FOUND));

		ensureParticipant(conversation, currentUserId);

		int safePage = Math.max(page, 0);
		int safeSize = Math.min(Math.max(size, 1), 100);

		Page<Message> result = messageRepository.findByConversationIdOrderByCreatedAtDesc(
				conversationId,
				PageRequest.of(safePage, safeSize, Sort.by("createdAt").descending())
		);

		List<MessageResponse> items = new ArrayList<>();
		List<Message> content = result.getContent();

		for (int i = content.size() - 1; i >= 0; i--) {
			items.add(modelMapper.map(content.get(i), MessageResponse.class));
		}
		return new PageImpl<>(
				items,
				result.getPageable(),
				result.getTotalElements()
		);
	}

	private boolean isValidMessage(MessageType type, ChatSendMessageRequest request) {
		if (type == MessageType.TEXT) {
			return request.getContent() != null && !request.getContent().isBlank();
		}
		return request.getMediaUrl() != null && !request.getMediaUrl().isBlank();
	}

	private String buildPreview(MessageType type, ChatSendMessageRequest request) {
		if (type == MessageType.TEXT) {
			return request.getContent();
		}
		return type.name();
	}

	private void ensureParticipant(Conversation conversation, String userId) {
		if (conversation.getParticipants() == null || conversation.getParticipants().stream().noneMatch(userId::equals)) {
			throw new AppException(ErrorCode.CHAT_CONVERSATION_FORBIDDEN);
		}
	}
}
