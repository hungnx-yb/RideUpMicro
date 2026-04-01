package com.rideUp.booking_service.enums;

public enum BookingStatus {
    PENDING,                 // vừa tạo, chờ thanh toán
    CONFIRMED,               // thanh toán thành công, ghế được giữ
    COMPLETED,               // chuyến hoàn thành
    CANCELLED_USER,          // khách hủy (có thể sau khi đã trả tiền)
    CANCELLED_PAYMENT_FAILED,// hủy do thanh toán thất bại/timeout
    EXPIRED                  // timeout hủy tự động
}
