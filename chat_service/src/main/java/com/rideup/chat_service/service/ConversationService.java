package com.rideup.chat_service.service;

import com.rideup.chat_service.dto.response.ApiResponse;
import com.rideup.chat_service.dto.response.BookingResponse;
import com.rideup.chat_service.dto.response.ConversationResponse;
import com.rideup.chat_service.dto.response.ReadReceiptResponse;
import com.rideup.chat_service.dto.response.TripResponse;
import com.rideup.chat_service.dto.response.UserResponse;
import com.rideup.chat_service.exception.AppException;
import com.rideup.chat_service.exception.ErrorCode;
import com.rideup.chat_service.feignClient.BookingFeignClient;
import com.rideup.chat_service.feignClient.IdentityServiceClient;
import com.rideup.chat_service.feignClient.TripFeignClient;
import com.rideup.chat_service.model.Conversation;
import com.rideup.chat_service.model.ConversationMember;
import com.rideup.chat_service.repository.ConversationMemberRepository;
import com.rideup.chat_service.repository.ConversationRepository;
import com.rideup.chat_service.repository.MessageRepository;
import com.rideup.chat_service.utils.SecurityUtils;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConversationService {
    ConversationRepository conversationRepository;
    ConversationMemberRepository conversationMemberRepository;
    MessageRepository messageRepository;
    BookingFeignClient bookingFeignClient;
    TripFeignClient tripFeignClient;
    IdentityServiceClient identityServiceClient;
    ChatSocketService chatSocketService;
    ModelMapper modelMapper;

    public ConversationResponse createOrGetByBookingId(String bookingId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Optional<Conversation> existing = conversationRepository.findByBookingId(bookingId);
        if (existing.isPresent()) {
            Conversation conversation = existing.get();
            ensureParticipant(conversation, currentUserId);
            Conversation saved = conversationRepository.save(conversation);
            return toConversationResponse(saved, resolveOtherUser(saved, currentUserId));
        }

        BookingResponse booking = fetchBooking(bookingId);
        TripResponse trip = fetchTrip(booking.getTripId());

        List<String> participants = List.of(booking.getCustomerId(), trip.getDriverId());
        if (participants.stream().noneMatch(currentUserId::equals)) {
            throw new AppException(ErrorCode.CHAT_CONVERSATION_FORBIDDEN);
        }

        Conversation conversation = new Conversation();
        conversation.setParticipants(participants);
        conversation.setBookingId(bookingId);
        Conversation saved = conversationRepository.save(conversation);

        for (String participant : participants) {
            conversationMemberRepository
                    .findByConversationIdAndUserId(saved.getId(), participant)
                    .orElseGet(() -> conversationMemberRepository.save(new ConversationMember(null, saved.getId(), participant, null)));
        }

        return toConversationResponse(saved, resolveOtherUser(saved, currentUserId));
    }

    public ConversationResponse getByBookingId(String bookingId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Conversation conversation = conversationRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_CONVERSATION_NOT_FOUND));
        ensureParticipant(conversation, currentUserId);
        return toConversationResponse(conversation, resolveOtherUser(conversation, currentUserId));
    }


    public void deleteConversation(String conversationId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_CONVERSATION_NOT_FOUND));
        ensureParticipant(conversation, currentUserId);

        conversationMemberRepository.deleteByConversationIdAndUserId(conversationId, currentUserId);

        List<String> participants = new ArrayList<>(conversation.getParticipants());
        participants.removeIf(participant -> participant != null && participant.equals(currentUserId));

        if (participants.isEmpty()) {
            messageRepository.deleteByConversationId(conversationId);
            conversationMemberRepository.deleteAll(conversationMemberRepository.findByConversationId(conversationId));
            conversationRepository.delete(conversation);
            return;
        }

        conversation.setParticipants(participants);
        conversationRepository.save(conversation);
    }

    public ReadReceiptResponse markRead(String conversationId) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CHAT_CONVERSATION_NOT_FOUND));
        ensureParticipant(conversation, currentUserId);

        LocalDateTime now = LocalDateTime.now();
        ConversationMember member = conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, currentUserId)
                .orElseGet(() -> new ConversationMember(null, conversationId, currentUserId, null));
        member.setLastReadAt(now);
        conversationMemberRepository.save(member);

        ReadReceiptResponse receipt = ReadReceiptResponse.builder()
                .conversationId(conversationId)
                .userId(currentUserId)
                .readAt(now)
                .build();
        chatSocketService.sendReadReceiptToParticipants(conversation, receipt, currentUserId);
        return receipt;
    }

    private BookingResponse fetchBooking(String bookingId) {
        ApiResponse<BookingResponse> bookingResponse = bookingFeignClient.getBookingById(bookingId);
        if (bookingResponse == null || bookingResponse.getResult() == null) {
            throw new AppException(ErrorCode.CHAT_BOOKING_NOT_FOUND);
        }
        return bookingResponse.getResult();
    }

    private TripResponse fetchTrip(String tripId) {
        ApiResponse<TripResponse> tripResponse = tripFeignClient.getTripById(tripId);
        if (tripResponse == null || tripResponse.getResult() == null) {
            throw new AppException(ErrorCode.CHAT_TRIP_NOT_FOUND);
        }
        return tripResponse.getResult();
    }

    private String resolveOtherUserId(Conversation conversation, String currentUserId) {
        if (conversation.getParticipants() == null) {
            return null;
        }
        return conversation.getParticipants().stream()
                .filter(Objects::nonNull)
                .filter(id -> !id.equals(currentUserId))
                .findFirst()
                .orElse(null);
    }


    private UserResponse resolveOtherUser(Conversation conversation, String currentUserId) {
        String otherUserId = resolveOtherUserId(conversation, currentUserId);
        if (otherUserId == null) {
            return null;
        }

        try {
            ApiResponse<List<UserResponse>> response = identityServiceClient.getUsersInfoByIds(List.of(otherUserId));
            List<UserResponse> users = response == null ? null : response.getResult();
            if (users == null || users.isEmpty()) {
                return null;
            }
            return users.get(0);
        } catch (Exception ignored) {
            return null;
        }
    }

    private ConversationResponse toConversationResponse(Conversation conversation, UserResponse otherUser) {
        ConversationResponse conversationResponse = modelMapper.map(conversation, ConversationResponse.class);
        conversationResponse.setOtherUser(otherUser);
        return conversationResponse;
    }

    private void ensureParticipant(Conversation conversation, String userId) {
        if (conversation.getParticipants() == null || conversation.getParticipants().stream().noneMatch(userId::equals)) {
            throw new AppException(ErrorCode.CHAT_CONVERSATION_FORBIDDEN);
        }
    }


}
