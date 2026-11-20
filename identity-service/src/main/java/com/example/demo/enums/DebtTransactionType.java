package com.example.demo.enums;

public enum DebtTransactionType {
    /** Cuốc tiền mặt hoàn thành: hoa hồng cộng vào công nợ */
    CASH_COMMISSION,
    /** Cuốc Stripe hoàn thành: sàn trích hoa hồng tại nguồn, công nợ không đổi */
    STRIPE_COMMISSION,
    /** Cấn trừ nợ tự động từ tiền payout Stripe */
    STRIPE_OFFSET,
    /** Tài xế chủ động nộp tiền trả nợ */
    MANUAL_PAYMENT,
    /** Điều chỉnh tăng nợ thủ công */
    ADJUSTMENT
}
