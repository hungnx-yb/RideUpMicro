package com.rideup.trip_service.dto.event;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TripRequestCancelEvent {
    String tripRequestId;
    String passengerId;
}
