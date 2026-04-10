package com.rideup.notification_service.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.kafka.annotation.KafkaListener;
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

	@KafkaListener(
			topics = "${app.kafka.topics.booking-confirmed}",
			groupId = "${spring.kafka.consumer.group-id}"
	)
	public void onBookingConfirmed(String payload) throws Exception {
		BookingConfirmedEvent event = objectMapper.readValue(payload, BookingConfirmedEvent.class);
		BookingResponse booking = resolveBooking(event.getBookingId());
		if (booking == null || booking.getCustomerId() == null) {
			log.warn("Skip booking-confirmed notification, booking not found for {}", event.getBookingId());
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
	}

	@KafkaListener(topics = "${app.kafka.topics.booking-cancelled}", groupId = "${spring.kafka.consumer.group-id}")
	public void onBookingCancelled(String payload) throws Exception {
		BookingCancelledEvent event = objectMapper.readValue(payload, BookingCancelledEvent.class);
		BookingResponse booking = resolveBooking(event.getBookingId());
		if (booking == null || booking.getCustomerId() == null) {
			log.warn("Skip booking-cancelled notification, booking not found for {}", event.getBookingId());
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
	}

	private String buildMetadata(String key, String value) {
		return buildMetadata(key, value, null, null);
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
}
