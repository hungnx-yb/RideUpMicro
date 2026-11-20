package com.rideup.notification_service.exception;


import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGOEIZED_EXCEPTION(9999, "Uncategized error", HttpStatus.INTERNAL_SERVER_ERROR),
    UNAUTHENTICATED(1006, "Unauthicated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permision", HttpStatus.FORBIDDEN),
    // Notification errors
    NOTIFICATION_NOT_FOUND(4001, "Notification not found", HttpStatus.NOT_FOUND),
    // ADM-FEAT-04
    BROADCAST_NOT_FOUND(4101, "Không tìm thấy chiến dịch phát sóng", HttpStatus.NOT_FOUND),
    BROADCAST_ALREADY_SENT(4102, "Chiến dịch đã được phát sóng", HttpStatus.BAD_REQUEST),
    BROADCAST_NO_RECIPIENT(4103, "Không có người nhận nào thỏa mãn tiêu chí lọc", HttpStatus.BAD_REQUEST),
    BROADCAST_NO_CHANNEL(4104, "Vui lòng chọn ít nhất một kênh phát sóng", HttpStatus.BAD_REQUEST),
    AUDIENCE_SERVICE_UNAVAILABLE(4105, "Không lấy được danh sách người nhận từ identity-service", HttpStatus.SERVICE_UNAVAILABLE);

    private Integer code;
    private String message;
    private HttpStatus httpStatus;

    private ErrorCode(Integer code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
