package com.rideUp.booking_service.dto.event;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SeatReleaseEvent {

    String eventId;
    String correlationId;
    String bookingId;
    String tripId;
    Integer seatCount;
    String reason;
    LocalDateTime createdAt;
}
