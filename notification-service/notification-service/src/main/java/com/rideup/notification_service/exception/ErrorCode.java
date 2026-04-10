package com.rideup.notification_service.exception;


import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGOEIZED_EXCEPTION(9999, "Uncategized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1006, "Unauthicated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permision", HttpStatus.FORBIDDEN),
    // Notification errors
    NOTIFICATION_NOT_FOUND(4001, "Notification not found", HttpStatus.NOT_FOUND);

    private Integer code;
    private String message;
    private HttpStatus httpStatus;

    private ErrorCode(Integer code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
