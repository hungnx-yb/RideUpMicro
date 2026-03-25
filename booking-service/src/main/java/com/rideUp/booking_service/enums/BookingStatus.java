package com.rideUp.booking_service.enums;

public enum BookingStatus {
    PENDING,     // vừa tạo, chờ thanh toán
    CONFIRMED,   // thanh toán thành công, ghế được giữ
    COMPLETED,   // chuyến hoàn thành
    CANCELLED,   // thanh toán thất bại hoặc hủy
    EXPIRED      // timeout hủy tự động
}
