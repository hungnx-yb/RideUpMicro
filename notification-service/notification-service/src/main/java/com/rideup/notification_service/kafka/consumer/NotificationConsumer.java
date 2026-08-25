package com.rideup.notification_service.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideup.notification_service.dto.event.BookingWaitingApprovalEvent;
import com.rideup.notification_service.feignClient.BookingFeignClient;
import com.rideup.notification_service.feignClient.TripFeignClient;
import com.rideup.notification_service.dto.event.BookingCancelledEvent;
import com.rideup.notification_service.dto.event.BookingConfirmedEvent;
import com.rideup.notification_service.dto.response.BookingResponse;
import com.rideup.notification_service.dto.response.TripResponse;
import com.rideup.notification_service.enums.NotificationType;
import com.rideup.notification_service.service.NotificationService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationConsumer {

	NotificationService notificationService;
	BookingFeignClient bookingClient;
	TripFeignClient tripClient;
	ObjectMapper objectMapper;

	@RetryableTopic(exclude = {com.fasterxml.jackson.core.JsonProcessingException.class})
	@KafkaListener(
			topics = "${app.kafka.topics.booking-confirmed}",
			groupId = "${spring.kafka.consumer.group-id}"
	)
	public void onBookingConfirmed(String payload, Acknowledgment ack) throws Exception {
		BookingConfirmedEvent event = objectMapper.readValue(payload, BookingConfirmedEvent.class);
		BookingResponse booking = resolveBooking(event.getBookingId());
		if (booking == null || booking.getCustomerId() == null) {
			log.warn("Skip booking-confirmed notification, booking not found for {}", event.getBookingId());
			ack.acknowledge();
			return;
		}

		String tripId = booking.getTripId() == null ? event.getTripId() : booking.getTripId();
		TripResponse trip = tripId == null ? null : resolveTrip(tripId);

		String title = "Đặt chỗ thành công";
		String message = String.format("Dat cho %s da duoc xac nhan.",
				booking.getBookingCode() == null ? event.getBookingId() : booking.getBookingCode());
		notificationService.createNotification(
				booking.getCustomerId(),
				title,
				message,
				NotificationType.BOOKING_CONFIRMED,
				buildMetadata("bookingId", event.getBookingId(), "tripId", tripId)
		);

		String driverId = trip == null ? null : trip.getDriverId();
		if (driverId != null && !driverId.equals(booking.getCustomerId())) {
			String driverTitle = "Co dat cho moi";
			String driverMessage = String.format("Dat cho %s vua duoc xac nhan.",
					booking.getBookingCode() == null ? event.getBookingId() : booking.getBookingCode());
			notificationService.createNotification(
					driverId,
					driverTitle,
					driverMessage,
					NotificationType.BOOKING_CONFIRMED,
					buildMetadata("bookingId", event.getBookingId(), "tripId", tripId)
			);
		}
		ack.acknowledge();
	}

	@RetryableTopic(exclude = {com.fasterxml.jackson.core.JsonProcessingException.class})
	@KafkaListener(topics = "${app.kafka.topics.booking-cancelled}", groupId = "${spring.kafka.consumer.group-id}")
	public void onBookingCancelled(String payload, Acknowledgment ack) throws Exception {
		BookingCancelledEvent event = objectMapper.readValue(payload, BookingCancelledEvent.class);
		BookingResponse booking = resolveBooking(event.getBookingId());
		if (booking == null || booking.getCustomerId() == null) {
			log.warn("Skip booking-cancelled notification, booking not found for {}", event.getBookingId());
			ack.acknowledge();
			return;
		}

		String title = "Dat cho bi huy";
		String reason = event.getReason() == null ? "" : (" Ly do: " + event.getReason());
		String message = String.format("Dat cho %s da bi huy.%s",
				booking.getBookingCode() == null ? event.getBookingId() : booking.getBookingCode(),
				reason);
		notificationService.createNotification(
				booking.getCustomerId(),
				title,
				message,
				NotificationType.BOOKING_CANCELLED,
				buildMetadata("bookingId", event.getBookingId(), "tripId", booking.getTripId())
		);
		ack.acknowledge();
	}

	@RetryableTopic(exclude = {com.fasterxml.jackson.core.JsonProcessingException.class})
	@KafkaListener(topics = "${app.kafka.topics.booking-completed}", groupId = "${spring.kafka.consumer.group-id}")
	public void onBookingCompleted(String payload, Acknowledgment ack) throws Exception {
		com.rideup.notification_service.dto.event.BookingCompletedEvent event = objectMapper.readValue(payload, com.rideup.notification_service.dto.event.BookingCompletedEvent.class);
		
		String title = "Chuyến đi hoàn thành";
		String message = "Chuyến đi của bạn đã hoàn thành. Vui lòng đánh giá chuyến đi.";
		notificationService.createNotification(
				event.getCustomerId(),
				title,
				message,
				NotificationType.BOOKING_COMPLETED,
				buildMetadata("bookingId", event.getBookingId(), "tripId", event.getTripId())
		);
		ack.acknowledge();
	}

	@RetryableTopic(exclude = {com.fasterxml.jackson.core.JsonProcessingException.class})
	@KafkaListener(topics = "${app.kafka.topics.booking-waiting-approval}", groupId = "${spring.kafka.consumer.group-id}")
	public void onBookingWaitingApproval(String payload, Acknowledgment ack) throws Exception {
		BookingWaitingApprovalEvent event = objectMapper.readValue(payload,BookingWaitingApprovalEvent.class);
		TripResponse trip = resolveTrip(event.getTripId());
		if (trip == null || trip.getDriverId() == null) {
			log.warn("Skip booking-waiting-approval notification, trip/driver not found for {}", event.getTripId());
			ack.acknowledge();
			return;
		}

		String driverId = trip.getDriverId();
		String title = "CÓ YÊU CẦU ĐẶT XE MỚI";
		String message = String.format("Bạn có một yêu cầu đặt xe mới (%s ghế, %s đ). Hệ thống sẽ tự động hủy sau 15 phút nếu bạn không nhận chuyến.",
				event.getSeatCount(), event.getTotalAmount());
				
		notificationService.createNotification(
				driverId,
				title,
				message,
				NotificationType.SYSTEM,
				buildMetadata("bookingId", event.getBookingId(), "tripId", event.getTripId())
		);
		ack.acknowledge();
	}


	private String buildMetadata(String key1, String value1, String key2, String value2) {
		try {
			Map<String, String> metadata = new HashMap<>();
			if (key1 != null && value1 != null) {
				metadata.put(key1, value1);
			}
			if (key2 != null && value2 != null) {
				metadata.put(key2, value2);
			}
			return objectMapper.writeValueAsString(metadata);
		} catch (Exception ex) {
			return "{}";
		}
	}

	private BookingResponse resolveBooking(String bookingId) {
		try {
			var response = bookingClient.getBookingById(bookingId);
			return response == null ? null : response.getResult();
		} catch (Exception ex) {
			log.warn("Failed to fetch booking {} for notification: {}", bookingId, ex.getMessage());
			return null;
		}
	}

	private TripResponse resolveTrip(String tripId) {
		try {
			var response = tripClient.getTripById(tripId);
			return response == null ? null : response.getResult();
		} catch (Exception ex) {
			log.warn("Failed to fetch trip {} for notification: {}", tripId, ex.getMessage());
			return null;
		}
	}

	@DltHandler
	public void handleDlt(ConsumerRecord<String, String> record, Exception ex) {
		log.error("[DLT][notification-service] Message permanently failed after all retries. " +
				"MANUAL INTERVENTION REQUIRED! topic={}, offset={}, payload={}, error={}",
				record.topic(), record.offset(), record.value(), ex.getMessage());
	}
}
