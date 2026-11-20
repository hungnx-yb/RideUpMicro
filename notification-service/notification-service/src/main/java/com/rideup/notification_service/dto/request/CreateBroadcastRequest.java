package com.rideup.notification_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * ADM-FEAT-04: Yêu cầu soạn / phát sóng thông báo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateBroadcastRequest {

    /** Nếu có: phát sóng bản nháp đã lưu (bỏ qua các trường còn lại) */
    String campaignId;

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
    String title;

    @NotBlank(message = "Tóm tắt không được để trống")
    @Size(max = 200, message = "Tóm tắt tối đa 200 ký tự")
    String summary;

    @Size(max = 20000, message = "Nội dung chi tiết quá dài")
    String content;

    @Size(max = 255, message = "Deep link tối đa 255 ký tự")
    String deepLink;

    /** ALL | DRIVER | CUSTOMER */
    String targetRole;
    List<String> provinceIds;
    Integer minReputation;
    Integer maxReputation;

    /** Gửi trực tiếp tới danh sách userId cụ thể (vd: nhắc nợ 1 tài xế). Ưu tiên hơn bộ lọc. */
    List<String> targetUserIds;

    /** IN_APP | WEBSOCKET | FCM */
    List<String> channels;

    /** BROADCAST (mặc định) | DEBT_REMINDER (nhắc nợ từ Sổ công nợ tài xế) */
    String category;
}
