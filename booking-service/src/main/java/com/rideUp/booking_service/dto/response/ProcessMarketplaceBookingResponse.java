package com.rideUp.booking_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProcessMarketplaceBookingResponse {
    String tripId;
    Integer seatCount;
    BigDecimal priceVnd;
    String passengerId;
}
