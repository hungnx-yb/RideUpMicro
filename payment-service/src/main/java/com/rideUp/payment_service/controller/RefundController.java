package com.rideUp.payment_service.controller;

import com.rideUp.payment_service.dto.response.ApiResponse;
import com.rideUp.payment_service.dto.response.RefundResponse;
import com.rideUp.payment_service.service.RefundService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/refund")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RefundController {

    RefundService refundService;
//
//    @PostMapping("/{paymentId}")
//    public ApiResponse<RefundResponse> refundPayment(
//            @PathVariable String paymentId
//    ) {
//        return ApiResponse.<RefundResponse>builder()
//                .message("Refund processed successfully")
//                .result(refundService.refundPayment(paymentId))
//                .build();
//    }

}
