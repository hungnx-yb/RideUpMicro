package com.rideup.notification_service.exception;
import com.rideup.notification_service.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {
    private static final String MIN_ATTRIBUTE = "min";


    @ExceptionHandler(value = org.springframework.http.converter.HttpMessageNotWritableException.class)
    public void handleHttpMessageNotWritableException(org.springframework.http.converter.HttpMessageNotWritableException exception) {
        log.warn("Ignored HttpMessageNotWritableException (usually from SockJS JSONP fallback): {}", exception.getMessage());
    }

    @ExceptionHandler(value = Exception.class)
    ResponseEntity<ApiResponse<?>> handlingRuntimeException(Exception exception) {
        log.error("Unhandled Exception: ", exception);
        ApiResponse<?> apiResponse = new ApiResponse<>();
        apiResponse.setCode(ErrorCode.UNCATEGOEIZED_EXCEPTION.getCode());
        apiResponse.setMessage(ErrorCode.UNCATEGOEIZED_EXCEPTION.getMessage());
        return ResponseEntity.status(ErrorCode.UNCATEGOEIZED_EXCEPTION.getHttpStatus()).body(apiResponse);
    }

    @ExceptionHandler(value = AuthenticationCredentialsNotFoundException.class)
    ResponseEntity<ApiResponse<?>> handlingAuthenticationCredentialsNotFoundException(
            AuthenticationCredentialsNotFoundException exception) {
        log.warn("Authentication Error: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHENTICATED;
        ApiResponse<?> apiResponse = new ApiResponse<>();
        apiResponse.setCode(errorCode.getCode());
        apiResponse.setMessage(errorCode.getMessage());
        return ResponseEntity.status(errorCode.getHttpStatus()).body(apiResponse);
    }

    @ExceptionHandler(value = AppException.class)
    ResponseEntity<ApiResponse<?>> handlingAppException(AppException exception) {
        log.warn("AppException occurred: Code={}, Message={}", exception.getErrorCode().getCode(), exception.getMessage());
        ErrorCode errorCode = exception.getErrorCode();
        ApiResponse<?> apiResponse = new ApiResponse<>();
        apiResponse.setCode(errorCode.getCode());
        apiResponse.setMessage(errorCode.getMessage());
        return ResponseEntity.status(errorCode.getHttpStatus()).body(apiResponse);
    }

    @ExceptionHandler(value = AccessDeniedException.class)
    ResponseEntity<ApiResponse<?>> handlingAccessDeniedException(AccessDeniedException exception) {
        log.warn("Access Denied: {}", exception.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }
}

