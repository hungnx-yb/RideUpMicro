package com.example.demo.util;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Tiện ích chuẩn hóa mã định danh theo chuẩn nghiệp vụ RideUp:
 * - Mã hồ sơ tài xế: HS-yyMM-XXXXXX (ví dụ: HS-2611-K8P9M2)
 * - Mã phương tiện (ID xe): XE-yyMM-XXXXXX (ví dụ: XE-2611-A4N7R8)
 *
 * Trong đó:
 * - Tiền tố (HS-, XE-): Phân loại thực thể rõ ràng.
 * - yyMM: Năm và tháng tạo hồ sơ, giúp nhận diện thời gian đăng ký.
 * - XXXXXX: 6 ký tự ngẫu nhiên từ bảng mã Base32 không chứa các ký tự dễ gây nhầm lẫn
 *   (bỏ 0, O, 1, I), mang lại 32^6 = hơn 1.07 tỷ tổ hợp khả dĩ trong mỗi tháng,
 *   đảm bảo tuyệt đối không trùng lặp và ngắn gọn, dễ đọc.
 */
public final class IdStandardizer {

    private static final String SAFE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyMM");

    private IdStandardizer() {
        // utility class
    }

    public static String generateDriverProfileId() {
        return generate("HS");
    }

    public static String generateVehicleId() {
        return generate("XE");
    }

    private static String generate(String prefix) {
        String period = LocalDateTime.now().format(DATE_FORMATTER);
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(SAFE_ALPHABET.charAt(RANDOM.nextInt(SAFE_ALPHABET.length())));
        }
        return String.format("%s-%s-%s", prefix, period, sb.toString());
    }
}
