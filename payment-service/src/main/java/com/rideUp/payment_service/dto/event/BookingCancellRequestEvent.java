package com.rideUp.payment_service.dto.event;
import lombok.*;
import lombok.experimental.FieldDefaults;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingCancellRequestEvent {
    String eventId;
    String correlationId;
    String bookingId;
    String tripId;
    Integer seatCount;
    String reason;
    LocalDateTime createdAt;
}
