package com.rideup.chat_service.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGOEIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),

    // Authentication & Authorization
    UNAUTHENTICATED(1006, "User is not authenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "User does not have permission", HttpStatus.FORBIDDEN),
    INVALID_OR_EXPIRED_TOKEN(1010, "Token has been expired or is invalid", HttpStatus.BAD_REQUEST),

    // Booking related errors
    BOOKING_NOT_FOUND(6001, "Booking not found", HttpStatus.NOT_FOUND),
    BOOKING_ALREADY_CONFIRMED(6002, "Booking is already confirmed", HttpStatus.BAD_REQUEST),
    BOOKING_ALREADY_CANCELLED(6003, "Booking is already cancelled", HttpStatus.BAD_REQUEST),
    BOOKING_EXPIRED(6004, "Booking has expired", HttpStatus.BAD_REQUEST),
    BOOKING_NOT_PENDING(6010, "Booking is not in pending state", HttpStatus.BAD_REQUEST),
    INVALID_SEAT_COUNT(6005, "Seat count must be greater than zero", HttpStatus.BAD_REQUEST),
    INVALID_PAYMENT_METHOD(6006, "Invalid payment method selected", HttpStatus.BAD_REQUEST),
    INVALID_PICKUP_STOP(6007, "Invalid pickup stop selection", HttpStatus.BAD_REQUEST),
    INVALID_DROPOFF_STOP(6008, "Invalid dropoff stop selection", HttpStatus.BAD_REQUEST),
    BOOKING_CODE_ALREADY_EXISTS(6009, "Booking code already exists (idempotency)", HttpStatus.CONFLICT),

    // Trip related errors
    TRIP_NOT_FOUND(5001, "Trip not found", HttpStatus.NOT_FOUND),
    SEAT_NOT_AVAILABLE(5003, "Not enough available seats", HttpStatus.BAD_REQUEST),
    VERSION_CONFLICT(5004, "Trip was updated, please retry", HttpStatus.CONFLICT),
    TRIP_SERVICE_UNAVAILABLE(5005, "Trip service is currently unavailable", HttpStatus.SERVICE_UNAVAILABLE),

    // Payment related errors
    PAYMENT_SERVICE_ERROR(7001, "Payment service error occurred", HttpStatus.SERVICE_UNAVAILABLE),
    PAYMENT_FAILED(7002, "Payment processing failed", HttpStatus.BAD_REQUEST),
    INVALID_TRANSACTION_ID(7003, "Invalid transaction ID", HttpStatus.BAD_REQUEST),

    // Chat related errors
    CHAT_CONVERSATION_NOT_FOUND(8001, "Conversation not found", HttpStatus.NOT_FOUND),
    CHAT_CONVERSATION_FORBIDDEN(8002, "No access to this conversation", HttpStatus.FORBIDDEN),
    CHAT_BOOKING_NOT_FOUND(8003, "Booking not found for conversation", HttpStatus.NOT_FOUND),
    CHAT_TRIP_NOT_FOUND(8004, "Trip not found for conversation", HttpStatus.NOT_FOUND),
    CHAT_MESSAGE_INVALID(8005, "Message content is invalid", HttpStatus.BAD_REQUEST);

    private Integer code;
    private String message;
    private HttpStatus httpStatus;

    private ErrorCode(Integer code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}