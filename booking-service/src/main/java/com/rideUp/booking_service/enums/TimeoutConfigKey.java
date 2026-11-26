package com.rideUp.booking_service.enums;

import lombok.Getter;

/**
 * ADM-FEAT-03: Danh mục tham số timeout vận hành (SLA) có thể cấu hình động.
 * Giá trị lưu theo đơn vị phút.
 */
@Getter
public enum TimeoutConfigKey {

    BOOKING_DRIVER_APPROVAL_TIMEOUT(
            "Mốc tự động hủy vé chờ duyệt trước giờ khởi hành",
            120, "booking-service",
            "Hủy vé (EXPIRED) và hoàn tiền giữ chỗ nếu tài xế chưa duyệt trước giờ khởi hành X phút."),

    BOOKING_MODIFICATION_RESPONSE_TIMEOUT(
            "Thời hạn tài xế phản hồi yêu cầu chỉnh sửa vé",
            15, "booking-service",
            "Yêu cầu chỉnh sửa hết hạn (EXPIRED), giữ nguyên vé cũ."),

    CUSTOMER_CANCEL_CUTOFF(
            "Mốc chặn khách tự hủy vé trước giờ khởi hành",
            120, "booking-service",
            "Sau mốc này khách không thể tự hủy vé trên ứng dụng."),

    MARKETPLACE_REQUEST_TTL(
            "Thời gian tồn tại của yêu cầu tìm xe trên Chợ nhu cầu",
            1440, "trip-service",
            "Yêu cầu chợ hết hạn (EXPIRED), tài xế không thể mời thêm."),

    TRIP_UNSTARTED_AUTO_CANCEL_TIMEOUT(
            "Thời gian tự hủy chuyến nếu tài xế không bắt đầu (sau giờ khởi hành)",
            60, "trip-service",
            "Tự động hủy chuyến (CANCELED) và hoàn tiền nếu quá thời gian sau giờ khởi hành mà tài xế không bắt đầu."),

    TRIP_AUTO_COMPLETE_TIMEOUT(
            "Thời gian tự hoàn thành chuyến sau giờ đến dự kiến",
            30, "trip-service",
            "Tự động hoàn thành chuyến (COMPLETED) và quyết toán nếu tài xế không bấm hoàn thành.");

    private final String displayName;
    private final int defaultMinutes;
    private final String ownerService;
    private final String expireAction;

    TimeoutConfigKey(String displayName, int defaultMinutes, String ownerService, String expireAction) {
        this.displayName = displayName;
        this.defaultMinutes = defaultMinutes;
        this.ownerService = ownerService;
        this.expireAction = expireAction;
    }
}
