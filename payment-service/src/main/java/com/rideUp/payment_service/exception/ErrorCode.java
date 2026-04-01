package com.rideUp.payment_service.exception;


import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1006, "User is not authenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "User does not have permission", HttpStatus.FORBIDDEN),

    PAYMENT_NOT_FOUND(7001, "Payment not found", HttpStatus.NOT_FOUND),
    PAYMENT_STATUS_INVALID(7002, "Invalid payment status transition", HttpStatus.BAD_REQUEST),
    BOOKING_CALLBACK_FAILED(7003, "Failed to notify booking service", HttpStatus.BAD_GATEWAY),
    INVALID_VNPAY_SIGNATURE(7004, "Invalid VNPay signature", HttpStatus.BAD_REQUEST),
    INVALID_VNPAY_CALLBACK(7005, "Invalid VNPay callback payload", HttpStatus.BAD_REQUEST),
    INVALID_PAYMENT_METHOD(7006, "Invalid payment method", HttpStatus.BAD_REQUEST),
    KAFKA_PUBLISH_FAILED(7007, "Failed to publish Kafka event", HttpStatus.BAD_GATEWAY),
    INVALID_PAYMENT_AMOUNT(7008, "Invalid payment amount", HttpStatus.BAD_REQUEST),
    PAYMENT_URL_NOT_FOUND(7009, "Payment URL not found", HttpStatus.NOT_FOUND),
    PAYMENT_URL_WAIT_INTERRUPTED(7010, "Interrupted while waiting for payment URL", HttpStatus.INTERNAL_SERVER_ERROR),
    PAYMENT_ALREADY_REFUNDED(7011, "Payment already refunded" , HttpStatus.BAD_REQUEST ),
    REFUND_FAILED(7012, "Failed to refund" , HttpStatus.BAD_REQUEST ),;
    private Integer code;
    private String message;
    private HttpStatus httpStatus;

    private ErrorCode(Integer code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}