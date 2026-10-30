package com.rideUp.booking_service.dto.response;

import com.rideUp.booking_service.enums.ModificationStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingModificationResponse {

    String id;
    String bookingId;
    String customerId;
    String tripId;

    String newPickupAddressText;
    Double newPickupLat;
    Double newPickupLng;
    String newPickupWardId;

    String newDropoffAddressText;
    Double newDropoffLat;
    Double newDropoffLng;
    String newDropoffWardId;

    String newPassengerName;
    String newPassengerPhone;
    String newNote;

    String oldPickupAddressText;
    Double oldPickupLat;
    Double oldPickupLng;
    String oldDropoffAddressText;
    Double oldDropoffLat;
    Double oldDropoffLng;
    String oldPassengerName;
    String oldPassengerPhone;
    String oldNote;

    ModificationStatus status;
    String rejectionReason;
    LocalDateTime expiresAt;
    LocalDateTime resolvedAt;
    LocalDateTime createdAt;
}
