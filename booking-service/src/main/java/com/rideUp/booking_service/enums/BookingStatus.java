package com.rideUp.booking_service.enums;

public enum BookingStatus {
    PENDING_PAYMENT,         // vừa tạo, chờ thanh toán thẻ
    WAITING_DRIVER_APPROVAL, // đã giữ tiền/chọn tiền mặt, chờ tài xế duyệt
    REJECTED_BY_DRIVER,      // tài xế từ chối
    CONFIRMED,               // tài xế đã duyệt
    COMPLETED,               // chuyến hoàn thành
    CANCELLED_USER,          // khách hủy
    CANCELLED_PAYMENT_FAILED,// hủy do thanh toán thất bại/timeout
    EXPIRED                  // timeout hủy tự động (tài xế không duyệt)
}
