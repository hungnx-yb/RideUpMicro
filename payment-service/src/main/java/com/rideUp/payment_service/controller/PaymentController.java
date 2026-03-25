package com.rideUp.payment_service.controller;

import com.rideUp.payment_service.dto.request.CreatePaymentRequest;
import com.rideUp.payment_service.dto.request.MarkPaymentFailedRequest;
import com.rideUp.payment_service.dto.request.MarkPaymentPaidRequest;
import com.rideUp.payment_service.dto.response.ApiResponse;
import com.rideUp.payment_service.dto.response.PaymentResponse;
import com.rideUp.payment_service.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PaymentController {

    PaymentService paymentService;

    @PostMapping
    public ApiResponse<PaymentResponse> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            HttpServletRequest httpServletRequest
    ) {
        return ApiResponse.<PaymentResponse>builder()
                .message("Payment created successfully")
                .result(paymentService.createPayment(request, httpServletRequest))
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<PaymentResponse> getPaymentById(@PathVariable String id) {
        return ApiResponse.<PaymentResponse>builder()
                .message("Payment retrieved successfully")
                .result(paymentService.getPaymentById(id))
                .build();
    }

    @GetMapping("/booking/{bookingId}")
    public ApiResponse<PaymentResponse> getPaymentByBookingId(@PathVariable String bookingId) {
        return ApiResponse.<PaymentResponse>builder()
                .message("Payment retrieved successfully")
                .result(paymentService.getPaymentByBookingId(bookingId))
                .build();
    }

    @PostMapping("/{id}/paid")
    public ApiResponse<PaymentResponse> markPaymentPaid(
            @PathVariable String id,
            @Valid @RequestBody MarkPaymentPaidRequest request
    ) {
        return ApiResponse.<PaymentResponse>builder()
                .message("Payment marked as paid")
                .result(paymentService.markPaymentPaid(id, request))
                .build();
    }

    @PostMapping("/{id}/failed")
    public ApiResponse<PaymentResponse> markPaymentFailed(
            @PathVariable String id,
            @RequestBody(required = false) MarkPaymentFailedRequest request
    ) {
        MarkPaymentFailedRequest payload = request == null
                ? MarkPaymentFailedRequest.builder().reason("Payment failed").build()
                : request;

        return ApiResponse.<PaymentResponse>builder()
                .message("Payment marked as failed")
                .result(paymentService.markPaymentFailed(id, payload))
                .build();
    }

        @GetMapping("/vnpay/callback")
        public ApiResponse<PaymentResponse> vnpayCallback(@RequestParam Map<String, String> params) {
                return ApiResponse.<PaymentResponse>builder()
                                .message("VNPay callback processed")
                                .result(paymentService.processVnpayCallback(params))
                                .build();
        }
}
