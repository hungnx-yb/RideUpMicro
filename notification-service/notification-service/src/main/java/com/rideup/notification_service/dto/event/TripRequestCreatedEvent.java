package com.rideup.notification_service.dto.event;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripRequestCreatedEvent {

    String tripRequestId;
    String passengerId;
    String startProvinceId;
    String endProvinceId;
    Integer seatTotal;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    LocalDateTime departureTime;
}
