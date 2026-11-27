import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import * as WebBrowser from 'expo-web-browser';
import { apiService } from '../services/apiService';
import DriverRatingCard from '../components/DriverRatingCard';

const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0EA5E9',
  stripeBrand: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  gold: '#D97706',
  cardBgLight: '#F1F5F9'
};

// Hạn mức mặc định khi chưa tải được cấu hình từ server (Admin có thể thay đổi)
const DEFAULT_DEBT_LIMIT = 500000;
const WARNING_RATIO = 0.8;

const formatMoney = (val) => {
  if (!val && val !== 0) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

const formatBookingCode = (code) => {
  if (!code) return 'N/A';
  const parts = code.split('-');
  return parts[parts.length - 1]?.toUpperCase() || code.slice(-7).toUpperCase();
};

const getPayoutStatusMeta = (status) => {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'ĐÃ GIẢI NGÂN',
        color: COLORS.success,
        bgColor: 'rgba(16, 185, 129, 0.12)',
        icon: 'arrow-down',
        iconBg: 'rgba(16, 185, 129, 0.12)',
        desc: 'Đã giải ngân về tài khoản Stripe của bạn'
      };
    case 'FULL_DEBT_OFFSET':
      return {
        label: 'CẤN TRỪ HẾT NỢ',
        color: COLORS.primary,
        bgColor: 'rgba(14, 165, 233, 0.12)',
        icon: 'swap-horizontal',
        iconBg: 'rgba(14, 165, 233, 0.12)',
        desc: 'Đã bù trừ 100% vào dư nợ hoa hồng tiền mặt'
      };
    case 'PARTIAL_OFFSET':
      return {
        label: 'TRỪ NỢ 1 PHẦN',
        color: COLORS.warning,
        bgColor: 'rgba(245, 158, 11, 0.12)',
        icon: 'pie-chart',
        iconBg: 'rgba(245, 158, 11, 0.12)',
        desc: 'Đã trừ một phần dư nợ và giải ngân phần còn lại'
      };
    case 'SKIPPED_NOT_ONBOARDED':
    case 'SKIPPED_NOT_CONNECTED':
      return {
        label: null,
        color: COLORS.danger,
        bgColor: 'transparent',
        icon: 'alert-circle',
        iconBg: 'rgba(239, 68, 68, 0.12)',
        desc: 'Hệ thống chưa thể giải ngân do chưa liên kết thẻ Stripe'
      };
    default:
      if (status && status.startsWith('SKIPPED')) {
        return {
          label: null,
          color: COLORS.danger,
          bgColor: 'transparent',
          icon: 'alert-circle',
          iconBg: 'rgba(239, 68, 68, 0.12)',
          desc: 'Hệ thống chưa thể giải ngân do chưa liên kết thẻ Stripe'
        };
      }
      return {
        label: status || 'KHÁC',
        color: COLORS.textMuted,
        bgColor: 'rgba(100, 116, 139, 0.12)',
        icon: 'receipt',
        iconBg: 'rgba(100, 116, 139, 0.12)',
        desc: ''
      };
  }
};

export default function WalletScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // Dữ liệu tài chính
  const [debt, setDebt] = useState(0);
  const [DEBT_LIMIT, setDebtLimit] = useState(DEFAULT_DEBT_LIMIT);
  const WARNING_LIMIT = DEBT_LIMIT * WARNING_RATIO;
  const [reputation, setReputation] = useState(null);
  const [driverReviews, setDriverReviews] = useState([]);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [expandedPayouts, setExpandedPayouts] = useState({});

  const toggleExpandPayout = (id) => {
    setExpandedPayouts((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const fetchAllData = useCallback(async () => {
    try {
      const [walletRes, repRes, stripeRes, payoutsRes, eligibilityRes] = await Promise.all([
        apiService.getMyWallet().catch(() => ({ data: { result: 0 } })),
        apiService.getDriverReputation().catch(() => null),
        apiService.getStripeAccountStatus().catch(() => null),
        apiService.getDriverPayouts().catch(() => null),
        apiService.getMyEligibility().catch(() => null)
      ]);

      setDebt(walletRes?.data?.result || 0);
      const creditLimit = Number(eligibilityRes?.data?.result?.creditLimit);
      if (creditLimit > 0) setDebtLimit(creditLimit);
      if (repRes?.data?.result) setReputation(repRes.data.result);
      if (stripeRes?.data?.result) setStripeStatus(stripeRes.data.result);
      if (payoutsRes?.data?.result) setPayouts(payoutsRes.data.result);

      const driverId = eligibilityRes?.data?.result?.driverId;
      if (driverId) {
        const reviewsRes = await apiService.getDriverReviews(driverId).catch(() => null);
        setDriverReviews(reviewsRes?.data?.result || []);
      }
    } catch (error) {
      console.log('Lỗi tải dữ liệu tài chính:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // 1. Nạp tiền trả nợ qua Stripe PaymentSheet
  const handleDeposit = async () => {
    if (debt <= 0) {
      Alert.alert('Thông báo', 'Bạn không có dư nợ cần thanh toán.');
      return;
    }

    try {
      setProcessing(true);
      const res = await apiService.depositWallet();
      const { paymentUrl, transactionId } = res.data.result;

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'RideUp Driver',
        paymentIntentClientSecret: paymentUrl,
        returnURL: 'rideup://stripe-redirect',
        defaultBillingDetails: {
          name: 'Tài xế RideUp',
        }
      });

      if (initError) {
        Alert.alert('Lỗi khởi tạo', initError.message);
        setProcessing(false);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        Alert.alert('Đã hủy', 'Bạn đã hủy thanh toán.');
        setProcessing(false);
        return;
      }

      await apiService.confirmDeposit(transactionId);
      Alert.alert('Thành công', 'Thanh toán dư nợ thành công!');
      fetchAllData();

    } catch (error) {
      Alert.alert('Lỗi thanh toán', error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  // 2. Liên kết tài khoản Stripe Express
  const handleConnectStripe = async () => {
    try {
      setConnectingStripe(true);
      const res = await apiService.createStripeOnboardLink();
      const onboardUrl = res.data?.result?.onboardUrl;

      if (onboardUrl) {
        await WebBrowser.openBrowserAsync(onboardUrl);
        // Khi quay trở lại app, refresh dữ liệu để kiểm tra trạng thái ACTIVE
        fetchAllData();
      } else {
        Alert.alert('Lỗi', 'Không thể tạo đường link liên kết Stripe.');
      }
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Lỗi khi gọi cổng liên kết Stripe.');
    } finally {
      setConnectingStripe(false);
    }
  };

  // 3. Mở cổng Stripe Express Portal để quản lý thẻ ATM / rút tiền
  const handleOpenStripeDashboard = async () => {
    try {
      const res = await apiService.createStripeDashboardLink();
      const dashboardUrl = res.data?.result?.dashboardUrl;
      if (dashboardUrl) {
        await WebBrowser.openBrowserAsync(dashboardUrl);
      } else {
        Alert.alert('Lỗi', 'Không thể lấy liên kết Stripe Portal.');
      }
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể mở Stripe Portal.');
    }
  };

  // Thông tin trạng thái nợ
  const getDebtStatus = () => {
    if (debt >= DEBT_LIMIT) {
      return { color: COLORS.danger, text: 'BỊ KHÓA NHẬN CHUYẾN', icon: 'lock-closed' };
    }
    if (debt >= WARNING_LIMIT) {
      return { color: COLORS.warning, text: 'GẦN CHẠM HẠN MỨC', icon: 'warning' };
    }
    return { color: COLORS.success, text: 'TÀI KHOẢN AN TOÀN', icon: 'shield-checkmark' };
  };

  const debtStatus = getDebtStatus();
  const debtProgress = Math.min(Math.max((debt / DEBT_LIMIT) * 100, 0), 100);

  // Phân trang danh sách giao dịch
  const totalPages = Math.ceil(payouts.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPayouts = payouts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted }}>Đang tải thông tin tài chính...</Text>
      </View>
    );
  }

  const isStripeActive = stripeStatus?.status === 'ACTIVE' && stripeStatus?.payoutsEnabled;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ví & Quản Lý Thu Nhập</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.backButton}>
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* =========================================================================
            CARD 1: DƯ NỢ HOA HỒNG TIỀN MẶT (CLEAN FINTECH CARD)
           ========================================================================= */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>DƯ NỢ HOA HỒNG</Text>
            <View style={[styles.statusPill, { backgroundColor: debtStatus.color + '14' }]}>
              <View style={[styles.dot, { backgroundColor: debtStatus.color }]} />
              <Text style={[styles.statusPillText, { color: debtStatus.color }]}>{debtStatus.text}</Text>
            </View>
          </View>

          <Text style={[styles.debtAmount, { color: debt > 0 ? COLORS.danger : COLORS.text }]}>
            {formatMoney(debt)}
          </Text>

          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${debtProgress}%`, backgroundColor: debtStatus.color }
                ]}
              />
            </View>
            <View style={styles.progressMetaRow}>
              <Text style={styles.progressSub}>Hạn mức {formatMoney(DEBT_LIMIT)}</Text>
              <Text style={styles.progressSub}>{debtProgress.toFixed(0)}%</Text>
            </View>
          </View>

          <Text style={styles.subtleCaption}>
            Tự động cấn trừ khi khách thanh toán qua Stripe.
          </Text>

          {debt > 0 && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleDeposit}
              disabled={processing}
              activeOpacity={0.85}
            >
              {processing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Thanh toán dư nợ ngay</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* =========================================================================
            CARD 2: UY TÍN & PHÍ SÀN (2-COLUMN CLEAN METRICS)
           ========================================================================= */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>UY TÍN & CHIẾT KHẤU</Text>
            <View style={[styles.statusPill, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
              <Text style={[styles.statusPillText, { color: COLORS.gold }]}>
                {reputation?.reputationScore >= 80 ? 'HẠNG VÀNG' : reputation?.reputationScore >= 60 ? 'HẠNG BẠC' : 'TIÊU CHUẨN'}
              </Text>
            </View>
          </View>

          <View style={styles.metricsSplitRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricBigVal}>
                {reputation?.reputationScore || 80}
                <Text style={styles.metricSubVal}> / 100</Text>
              </Text>
              <Text style={styles.metricLabel}>Điểm uy tín</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCol}>
              <Text style={styles.metricBigVal}>
                {reputation?.effectiveRate
                  ? (Number(reputation.effectiveRate) * 100).toFixed(1)
                  : reputation?.baseRate
                    ? (Number(reputation.baseRate) * 100).toFixed(1)
                    : '18.0'}%
              </Text>
              <Text style={styles.metricLabel}>
                {reputation?.discount && Number(reputation.discount) > 0
                  ? `Đã giảm ${(Number(reputation.discount) * 100).toFixed(1)}%`
                  : 'Phí sàn hiện tại'}
              </Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${reputation?.reputationScore || 80}%`, backgroundColor: COLORS.gold }
              ]}
            />
          </View>
        </View>

        {/* =========================================================================
            CARD 2B: THỐNG KÊ ĐÁNH GIÁ SAO (1-5 SAO & SAO TRUNG BÌNH TÍNH HOA HỒNG)
           ========================================================================= */}
        <DriverRatingCard
          averageRating={reputation?.driverRating}
          reviews={driverReviews}
        />

        {/* =========================================================================
            CARD 3: CỔNG NHẬN TIỀN STRIPE CONNECT EXPRESS (CLEAN SETTINGS STYLE)
           ========================================================================= */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconBoxSmall, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
                <Ionicons name="card-outline" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Stripe Connect Express</Text>
                <Text style={styles.cardSub}>Cổng nhận tiền trực tuyến</Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: isStripeActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)' }]}>
              <View style={[styles.dot, { backgroundColor: isStripeActive ? COLORS.success : COLORS.warning }]} />
              <Text style={[styles.statusPillText, { color: isStripeActive ? COLORS.success : COLORS.warning }]}>
                {isStripeActive ? 'ĐÃ KÍCH HOẠT' : 'CHƯA LIÊN KẾT'}
              </Text>
            </View>
          </View>

          {isStripeActive ? (
            <View>
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Giải ngân</Text>
                <Text style={[styles.kvValue, { color: COLORS.success }]}>Tự động về ATM 24/7</Text>
              </View>

              <View style={styles.cardHairlineDivider} />

              <TouchableOpacity
                style={styles.settingsActionRow}
                onPress={handleOpenStripeDashboard}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsActionText}>Quản lý thẻ ATM & Rút tiền</Text>
                <Ionicons name="open-outline" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.subtleCaption}>
                Liên kết tài khoản ngân hàng để nhận thanh toán tự động từ các cuốc xe trực tuyến.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleConnectStripe}
                disabled={connectingStripe}
                activeOpacity={0.85}
              >
                {connectingStripe ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Liên kết tài khoản Stripe</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* =========================================================================
            CARD 4: LỊCH SỬ GIAO DỊCH (GROUPED LIST CARD)
           ========================================================================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          <Text style={styles.sectionSubCount}>{payouts.length} giao dịch</Text>
        </View>

        {payouts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={30} color={COLORS.textMuted} />
            <Text style={styles.emptyTextTitle}>Chưa có giao dịch</Text>
            <Text style={styles.emptyText}>Chưa phát sinh giao dịch giải ngân hoặc cấn trừ nợ nào</Text>
          </View>
        ) : (
          <View style={styles.groupedListCard}>
            {paginatedPayouts.map((tx, idx) => {
              const isExpanded = !!expandedPayouts[tx.id];
              const isLast = idx === paginatedPayouts.length - 1;
              const meta = getPayoutStatusMeta(tx.status);
              const bookingShort = formatBookingCode(tx.bookingId);
              const payoutAmount = Number(tx.finalPayoutAmount) || 0;

              return (
                <View key={tx.id} style={!isLast && styles.listRowBorder}>
                  <TouchableOpacity
                    style={styles.listRow}
                    onPress={() => toggleExpandPayout(tx.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.listIconCircle, { backgroundColor: meta.iconBg }]}>
                      <Ionicons name={meta.icon} size={17} color={meta.color} />
                    </View>

                    <View style={styles.listMainInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.listTitle}>Cuốc #{bookingShort}</Text>
                        {meta.label ? (
                          <View style={[styles.miniStatusPill, { backgroundColor: meta.bgColor }]}>
                            <Text style={[styles.miniStatusText, { color: meta.color }]}>{meta.label}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.listSub}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : 'Mới hoàn tất'}
                      </Text>
                    </View>

                    <View style={styles.listRight}>
                      <Text style={[styles.listAmount, { color: payoutAmount > 0 ? COLORS.success : COLORS.text }]}>
                        {payoutAmount > 0 ? `+${formatMoney(payoutAmount)}` : formatMoney(payoutAmount)}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={COLORS.textMuted}
                        style={{ marginTop: 2 }}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.expandedBreakdown}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Giá vé (Stripe)</Text>
                        <Text style={styles.detailVal}>+{formatMoney(tx.totalFare)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          Phí sàn ({((Number(tx.commissionRate) || 0.18) * 100).toFixed(1)}%)
                        </Text>
                        <Text style={[styles.detailVal, { color: COLORS.danger }]}>
                          -{formatMoney(tx.commissionAmount)}
                        </Text>
                      </View>
                      {tx.debtDeducted > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Cấn trừ nợ cũ</Text>
                          <Text style={[styles.detailVal, { color: COLORS.warning }]}>
                            -{formatMoney(tx.debtDeducted)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailDivider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailTotalLabel}>Thực nhận về Stripe</Text>
                        <Text style={[styles.detailTotalVal, { color: payoutAmount > 0 ? COLORS.success : COLORS.text }]}>
                          +{formatMoney(payoutAmount)}
                        </Text>
                      </View>
                      {meta.desc ? (
                        <Text style={styles.detailNoteText}>{meta.desc}</Text>
                      ) : null}
                      {tx.stripeTransferId && tx.stripeTransferId.startsWith('tr_') ? (
                        <Text style={styles.detailTransferId}>Mã GD: {tx.stripeTransferId}</Text>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Pagination */}
        {payouts.length > 0 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, safeCurrentPage === 1 && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safeCurrentPage === 1}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={16} color={safeCurrentPage === 1 ? COLORS.border : COLORS.text} />
              <Text style={[styles.pageBtnText, safeCurrentPage === 1 && styles.pageBtnTextDisabled]}>Trước</Text>
            </TouchableOpacity>

            <Text style={styles.pageIndicatorText}>
              Trang {safeCurrentPage} / {totalPages}
            </Text>

            <TouchableOpacity
              style={[styles.pageBtn, safeCurrentPage === totalPages && styles.pageBtnDisabled]}
              onPress={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={safeCurrentPage === totalPages}
              activeOpacity={0.7}
            >
              <Text style={[styles.pageBtnText, safeCurrentPage === totalPages && styles.pageBtnTextDisabled]}>Sau</Text>
              <Ionicons name="chevron-forward" size={16} color={safeCurrentPage === totalPages ? COLORS.border : COLORS.text} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backButton: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // UNIFIED PRODUCTION CARD (MATCHING DriverRatingCard)
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.6
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1
  },
  iconBoxSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // PILL BADGES
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // DEBT SUMMARY
  debtAmount: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 14
  },
  progressSection: { marginBottom: 10 },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.cardBgLight,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  progressSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500'
  },
  subtleCaption: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },

  // 2-COLUMN REPUTATION METRICS
  metricsSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  metricCol: {
    flex: 1
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 16
  },
  metricBigVal: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text
  },
  metricSubVal: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },

  // STRIPE SETTINGS CARD
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5
  },
  kvLabel: {
    fontSize: 13,
    color: COLORS.textMuted
  },
  kvValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  cardHairlineDivider: {
    height: 1,
    backgroundColor: COLORS.cardBgLight,
    marginVertical: 12
  },
  settingsActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2
  },
  settingsActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary
  },

  // PAYOUT LEDGER
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  sectionSubCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted
  },

  emptyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyTextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 4
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center'
  },

  // GROUPED LIST CARD
  groupedListCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBgLight
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12
  },
  listIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listMainInfo: {
    flex: 1
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  miniStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  miniStatusText: {
    fontSize: 9,
    fontWeight: '700'
  },
  listSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  listRight: {
    alignItems: 'flex-end'
  },
  listAmount: {
    fontSize: 14,
    fontWeight: '700'
  },

  // EXPANDED BREAKDOWN
  expandedBreakdown: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBgLight
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6
  },
  detailTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  detailTotalVal: {
    fontSize: 13,
    fontWeight: '700'
  },
  detailNoteText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6
  },
  detailTransferId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4
  },

  // MINIMAL PAGINATION
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  pageBtnDisabled: {
    backgroundColor: COLORS.cardBgLight,
    borderColor: 'transparent'
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text
  },
  pageBtnTextDisabled: {
    color: COLORS.textMuted
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  }
});
