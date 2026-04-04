package com.rideUp.booking_service.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class IdempotencyRecord {
    String status;       // PROCESSING | SUCCESS
    String requestHash;
    String response;
    Integer httpStatus;
    String contentType;
    long createdAt;
}
