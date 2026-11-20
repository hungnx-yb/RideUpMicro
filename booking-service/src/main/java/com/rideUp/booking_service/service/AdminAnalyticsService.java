package com.rideUp.booking_service.service;

import com.rideUp.booking_service.dto.response.DriverDebtResponse;
import com.rideUp.booking_service.dto.response.FinanceSummaryResponse;
import com.rideUp.booking_service.dto.response.RevenueKpiResponse;
import com.rideUp.booking_service.dto.response.RevenueKpiResponse.DailyRevenuePoint;
import com.rideUp.booking_service.entity.Booking;
import com.rideUp.booking_service.enums.BookingStatus;
import com.rideUp.booking_service.enums.PaymentMethod;
import com.rideUp.booking_service.feignClient.IdentityServiceClient;
import com.rideUp.booking_service.repository.BookingRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * ADM-FEAT-02: Tổng hợp báo cáo doanh thu (GMV từ booking-service + hoa hồng/công nợ từ identity-service)
 * và xuất file Excel đối soát.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AdminAnalyticsService {

    private static final List<BookingStatus> CANCELLED_STATUSES = List.of(
            BookingStatus.CANCELLED_USER, BookingStatus.CANCELLED_DRIVER,
            BookingStatus.CANCELLED_PAYMENT_FAILED, BookingStatus.REJECTED_BY_DRIVER, BookingStatus.EXPIRED);
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    BookingRepository bookingRepository;
    BookingService bookingService;
    IdentityServiceClient identityServiceClient;

    @Transactional(readOnly = true)
    public RevenueKpiResponse getRevenueKpis(LocalDate fromDate, LocalDate toDate, String paymentMethod) {
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().withDayOfMonth(1);
        LocalDate to = toDate != null ? toDate : LocalDate.now();
        if (to.isBefore(from)) {
            LocalDate tmp = from;
            from = to;
            to = tmp;
        }
        String method = normalizeMethod(paymentMethod);

        List<Booking> completed = loadCompleted(from, to, method);

        BigDecimal cashGmv = BigDecimal.ZERO;
        BigDecimal stripeGmv = BigDecimal.ZERO;
        Map<LocalDate, DailyRevenuePoint> daily = new TreeMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            daily.put(d, DailyRevenuePoint.builder()
                    .date(d).gmv(BigDecimal.ZERO).cashGmv(BigDecimal.ZERO).stripeGmv(BigDecimal.ZERO).bookings(0)
                    .build());
        }

        for (Booking booking : completed) {
            BigDecimal amount = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;
            boolean isStripe = bookingService.resolvePaymentMethod(booking) == PaymentMethod.STRIPE;
            if (isStripe) {
                stripeGmv = stripeGmv.add(amount);
            } else {
                cashGmv = cashGmv.add(amount);
            }
            DailyRevenuePoint point = daily.get(completedAt(booking).toLocalDate());
            if (point != null) {
                point.setGmv(point.getGmv().add(amount));
                point.setBookings(point.getBookings() + 1);
                if (isStripe) {
                    point.setStripeGmv(point.getStripeGmv().add(amount));
                } else {
                    point.setCashGmv(point.getCashGmv().add(amount));
                }
            }
        }

        BigDecimal totalGmv = cashGmv.add(stripeGmv);
        long cancelled = bookingRepository.countByStatusInAndCancelledAtGreaterThanEqualAndCancelledAtLessThan(
                CANCELLED_STATUSES, from.atStartOfDay(), to.plusDays(1).atStartOfDay());

        RevenueKpiResponse.RevenueKpiResponseBuilder builder = RevenueKpiResponse.builder()
                .fromDate(from)
                .toDate(to)
                .paymentMethod(method)
                .totalGmv(totalGmv)
                .cashGmv(cashGmv)
                .stripeGmv(stripeGmv)
                .completedBookings(completed.size())
                .cancelledBookings(cancelled)
                .averageTicketValue(completed.isEmpty() ? BigDecimal.ZERO
                        : totalGmv.divide(BigDecimal.valueOf(completed.size()), 0, RoundingMode.HALF_UP))
                .dailySeries(new ArrayList<>(daily.values()));

        FinanceSummaryResponse finance = fetchFinanceSummary(from, to, method);
        if (finance != null) {
            builder.financeAvailable(true)
                    .commissionRevenue(finance.getCommissionRevenue())
                    .cashCommission(finance.getCashCommission())
                    .stripeCommission(finance.getStripeCommission())
                    .outstandingDebt(finance.getOutstandingDebt())
                    .stripeOffsetRecovered(finance.getStripeOffsetRecovered())
                    .manualDebtPaid(finance.getManualDebtPaid())
                    .driversWithDebt(finance.getDriversWithDebt())
                    .driversOverLimit(finance.getDriversOverLimit())
                    .creditLimit(finance.getCreditLimit());
        } else {
            builder.financeAvailable(false);
        }
        return builder.build();
    }

    /**
     * Xuất file Excel đối soát gồm 3 sheet: Tổng quan KPI, Chi tiết vé hoàn thành, Công nợ tài xế.
     */
    @Transactional(readOnly = true)
    public byte[] exportRevenueExcel(LocalDate fromDate, LocalDate toDate, String paymentMethod) {
        RevenueKpiResponse kpi = getRevenueKpis(fromDate, toDate, paymentMethod);
        List<Booking> completed = loadCompleted(kpi.getFromDate(), kpi.getToDate(), kpi.getPaymentMethod());
        List<DriverDebtResponse> debts = fetchDriverDebts();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle header = headerStyle(workbook);
            CellStyle money = moneyStyle(workbook);

            // Sheet 1: Tổng quan
            Sheet summary = workbook.createSheet("Tong quan");
            int r = 0;
            r = writeRow(summary, r, header, null, "Báo cáo doanh thu & công nợ RideUp", "");
            r = writeRow(summary, r, null, null, "Kỳ báo cáo",
                    kpi.getFromDate() + " → " + kpi.getToDate());
            r = writeRow(summary, r, null, null, "Phương thức thanh toán", kpi.getPaymentMethod());
            r++;
            r = writeRow(summary, r, header, null, "Chỉ số", "Giá trị");
            r = writeMoneyRow(summary, r, money, "Tổng GMV giao dịch", kpi.getTotalGmv());
            r = writeMoneyRow(summary, r, money, "GMV tiền mặt", kpi.getCashGmv());
            r = writeMoneyRow(summary, r, money, "GMV Stripe", kpi.getStripeGmv());
            r = writeRow(summary, r, null, null, "Số vé hoàn thành", String.valueOf(kpi.getCompletedBookings()));
            r = writeRow(summary, r, null, null, "Số vé hủy/hết hạn", String.valueOf(kpi.getCancelledBookings()));
            if (kpi.isFinanceAvailable()) {
                r = writeMoneyRow(summary, r, money, "Doanh thu hoa hồng sàn", kpi.getCommissionRevenue());
                r = writeMoneyRow(summary, r, money, "Công nợ đang treo", kpi.getOutstandingDebt());
                r = writeMoneyRow(summary, r, money, "Nợ đã cấn trừ qua Stripe", kpi.getStripeOffsetRecovered());
                r = writeMoneyRow(summary, r, money, "Nợ tài xế tự nộp", kpi.getManualDebtPaid());
                writeRow(summary, r, null, null, "Tài xế vượt hạn mức nợ", String.valueOf(kpi.getDriversOverLimit()));
            }
            summary.setColumnWidth(0, 40 * 256);
            summary.setColumnWidth(1, 30 * 256);

            // Sheet 2: Chi tiết vé
            Sheet detail = workbook.createSheet("Ve hoan thanh");
            writeRow(detail, 0, header, null, "Mã vé", "Hoàn thành lúc", "Mã chuyến", "Số ghế",
                    "Thanh toán", "Trạng thái TT", "Giá trị vé (VNĐ)");
            int row = 1;
            for (Booking b : completed) {
                Row excelRow = detail.createRow(row++);
                excelRow.createCell(0).setCellValue(nullSafe(b.getBookingCode()));
                excelRow.createCell(1).setCellValue(completedAt(b).format(DATE_TIME_FMT));
                excelRow.createCell(2).setCellValue(nullSafe(b.getTripId()));
                excelRow.createCell(3).setCellValue(b.getSeatCount() != null ? b.getSeatCount() : 0);
                excelRow.createCell(4).setCellValue(bookingService.resolvePaymentMethod(b).name());
                excelRow.createCell(5).setCellValue(b.getPaymentStatus() != null ? b.getPaymentStatus().name() : "");
                Cell amountCell = excelRow.createCell(6);
                amountCell.setCellValue(b.getTotalAmount() != null ? b.getTotalAmount().doubleValue() : 0);
                amountCell.setCellStyle(money);
            }
            for (int c = 0; c < 7; c++) {
                detail.setColumnWidth(c, 22 * 256);
            }

            // Sheet 3: Công nợ tài xế
            Sheet debtSheet = workbook.createSheet("Cong no tai xe");
            writeRow(debtSheet, 0, header, null, "Tài xế", "Email", "SĐT", "Biển số",
                    "Điểm uy tín", "Công nợ (VNĐ)", "Hạn mức (VNĐ)", "Trạng thái");
            row = 1;
            for (DriverDebtResponse d : debts) {
                Row excelRow = debtSheet.createRow(row++);
                excelRow.createCell(0).setCellValue(nullSafe(d.getFullName()));
                excelRow.createCell(1).setCellValue(nullSafe(d.getEmail()));
                excelRow.createCell(2).setCellValue(nullSafe(d.getPhoneNumber()));
                excelRow.createCell(3).setCellValue(nullSafe(d.getPlateNumber()));
                excelRow.createCell(4).setCellValue(d.getReputationScore() != null ? d.getReputationScore() : 0);
                Cell debtCell = excelRow.createCell(5);
                debtCell.setCellValue(d.getSystemDebt() != null ? d.getSystemDebt().doubleValue() : 0);
                debtCell.setCellStyle(money);
                Cell limitCell = excelRow.createCell(6);
                limitCell.setCellValue(d.getCreditLimit() != null ? d.getCreditLimit().doubleValue() : 0);
                limitCell.setCellStyle(money);
                excelRow.createCell(7).setCellValue(debtStatusLabel(d.getDebtStatus()));
            }
            for (int c = 0; c < 8; c++) {
                debtSheet.setColumnWidth(c, 20 * 256);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không thể tạo file Excel báo cáo", e);
        }
    }

    // ===================== Helpers =====================

    private List<Booking> loadCompleted(LocalDate from, LocalDate to, String method) {
        return bookingRepository.findCompletedBetween(from.atStartOfDay(), to.plusDays(1).atStartOfDay())
                .stream()
                .filter(b -> "ALL".equals(method)
                        || bookingService.resolvePaymentMethod(b).name().equals(method))
                .toList();
    }

    private FinanceSummaryResponse fetchFinanceSummary(LocalDate from, LocalDate to, String method) {
        try {
            var response = identityServiceClient.getFinanceSummary(from.toString(), to.toString(), method);
            return response != null ? response.getResult() : null;
        } catch (Exception e) {
            log.warn("[Analytics] Cannot fetch finance summary from identity-service: {}", e.getMessage());
            return null;
        }
    }

    private List<DriverDebtResponse> fetchDriverDebts() {
        try {
            var response = identityServiceClient.getDriverDebts("ALL");
            return response != null && response.getResult() != null ? response.getResult() : List.of();
        } catch (Exception e) {
            log.warn("[Analytics] Cannot fetch driver debts from identity-service: {}", e.getMessage());
            return List.of();
        }
    }

    private static LocalDateTime completedAt(Booking booking) {
        if (booking.getCompletedAt() != null) {
            return booking.getCompletedAt();
        }
        return booking.getUpdatedAt() != null ? booking.getUpdatedAt() : booking.getCreatedAt();
    }

    private static String normalizeMethod(String method) {
        if (method == null || method.isBlank()) {
            return "ALL";
        }
        String upper = method.trim().toUpperCase(Locale.ROOT);
        return ("CASH".equals(upper) || "STRIPE".equals(upper)) ? upper : "ALL";
    }

    private static String debtStatusLabel(String status) {
        if ("BLOCKED".equals(status)) {
            return "Quá hạn mức (Bị khóa)";
        }
        if ("WARNING".equals(status)) {
            return "Sắp chạm hạn mức";
        }
        return "Bình thường";
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private static int writeRow(Sheet sheet, int rowIndex, CellStyle style, CellStyle unused, String... values) {
        Row row = sheet.createRow(rowIndex);
        for (int i = 0; i < values.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(values[i]);
            if (style != null) {
                cell.setCellStyle(style);
            }
        }
        return rowIndex + 1;
    }

    private static int writeMoneyRow(Sheet sheet, int rowIndex, CellStyle money, String label, BigDecimal value) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(label);
        Cell cell = row.createCell(1);
        cell.setCellValue(value != null ? value.doubleValue() : 0);
        cell.setCellStyle(money);
        return rowIndex + 1;
    }

    private static CellStyle headerStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.LIGHT_ORANGE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private static CellStyle moneyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));
        return style;
    }
}
