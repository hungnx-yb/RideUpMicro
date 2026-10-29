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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import * as WebBrowser from 'expo-web-browser';
import { apiService } from '../services/apiService';

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

const DEBT_LIMIT = 500000;
const WARNING_LIMIT = 400000;

const formatMoney = (val) => {
  if (!val && val !== 0) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

export default function WalletScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // Dữ liệu tài chính
  const [debt, setDebt] = useState(0);
  const [reputation, setReputation] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'OFFSET'

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const fetchAllData = useCallback(async () => {
    try {
      const [walletRes, repRes, stripeRes, payoutsRes] = await Promise.all([
        apiService.getMyWallet().catch(() => ({ data: { result: 0 } })),
        apiService.getDriverReputation().catch(() => null),
        apiService.getStripeAccountStatus().catch(() => null),
        apiService.getDriverPayouts().catch(() => null)
      ]);

      setDebt(walletRes?.data?.result || 0);
      if (repRes?.data?.result) setReputation(repRes.data.result);
      if (stripeRes?.data?.result) setStripeStatus(stripeRes.data.result);
      if (payoutsRes?.data?.result) setPayouts(payoutsRes.data.result);
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

  // Lọc danh sách giải ngân
  const filteredPayouts = payouts.filter((p) => {
    if (activeTab === 'COMPLETED') return p.status === 'COMPLETED';
    if (activeTab === 'OFFSET') return p.status === 'FULL_DEBT_OFFSET';
    return true;
  });

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
            CARD 1: TỔNG QUAN DƯ NỢ TIỀN MẶT & HẠN MỨC 500K
           ========================================================================= */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>DƯ NỢ HOA HỒNG TIỀN MẶT</Text>
              <Text style={[styles.debtAmount, { color: debt > 0 ? COLORS.danger : COLORS.success }]}>
                {formatMoney(debt)}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: debtStatus.color + '15' }]}>
              <Ionicons name={debtStatus.icon} size={14} color={debtStatus.color} />
              <Text style={[styles.statusPillText, { color: debtStatus.color }]}>{debtStatus.text}</Text>
            </View>
          </View>

          {/* Thanh đo hạn mức nợ 500k */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressSub}>Hạn mức tối đa: {formatMoney(DEBT_LIMIT)}</Text>
              <Text style={[styles.progressSub, { fontWeight: '700', color: debtStatus.color }]}>
                {debtProgress.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${debtProgress}%`, backgroundColor: debtStatus.color }
                ]}
              />
            </View>
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={16} color={COLORS.primary} />
            <Text style={styles.tipText}>
              Dư nợ sẽ được <Text style={{ fontWeight: '700' }}>tự động cấn trừ</Text> khi có khách hàng thanh toán qua thẻ Stripe.
            </Text>
          </View>

          {debt > 0 && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={handleDeposit}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="card-outline" size={18} color="#FFF" />
                  <Text style={styles.payBtnText}>Thanh toán nợ chủ động qua thẻ</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* =========================================================================
            CARD 2: HẠNG UY TÍN & HOA HỒNG CÁ NHÂN HÓA (GIAI ĐOẠN 2)
           ========================================================================= */}
        <View style={[styles.card, { borderColor: 'rgba(217, 119, 6, 0.2)', borderWidth: 1 }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.shieldIconBox}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.gold} />
              </View>
              <View>
                <Text style={styles.cardLabel}>ĐIỂM UY TÍN TÀI XẾ</Text>
                <Text style={styles.reputationScoreText}>
                  {reputation?.reputationScore || 80} <Text style={{ fontSize: 16, color: COLORS.textMuted }}>/ 100</Text>
                </Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
              <Text style={[styles.statusPillText, { color: COLORS.gold, fontWeight: '700' }]}>
                {reputation?.reputationScore >= 80 ? 'HẠNG VÀNG' : reputation?.reputationScore >= 60 ? 'HẠNG BẠC' : 'TIÊU CHUẨN'}
              </Text>
            </View>
          </View>

          {/* Thanh điểm uy tín */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${reputation?.reputationScore || 80}%`, backgroundColor: COLORS.gold }
                ]}
              />
            </View>
          </View>

          {/* Badge Tỷ lệ hoa hồng cá nhân hóa */}
          <View style={styles.commissionBanner}>
            <View>
              <Text style={styles.commissionSubLabel}>Hoa hồng áp dụng hiện tại:</Text>
              <Text style={styles.commissionRateValue}>
                {reputation?.effectiveRate ? (reputation.effectiveRate * 100).toFixed(1) : '18.0'}%
              </Text>
            </View>
            {reputation?.discount > 0 ? (
              <View style={styles.discountBadge}>
                <Ionicons name="trending-down" size={14} color={COLORS.success} />
                <Text style={styles.discountBadgeText}>
                  Giảm {(reputation.discount * 100).toFixed(1)}% phí sàn
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Mức gốc: 18.0%</Text>
            )}
          </View>

          <Text style={styles.reputationHint}>
            ✨ Lái xe an toàn (+1đ/chuyến) và nhận đánh giá 5 sao (+1đ) để được giảm hoa hồng tới mức tối đa 12.0%!
          </Text>
        </View>

        {/* =========================================================================
            CARD 3: CỔNG NHẬN TIỀN STRIPE CONNECT EXPRESS (GIAI ĐOẠN 3)
           ========================================================================= */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.shieldIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="card" size={20} color={COLORS.stripeBrand} />
              </View>
              <View>
                <Text style={styles.cardLabel}>CỔNG NHẬN TIỀN TRỰC TUYẾN</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>Stripe Connect Express</Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: isStripeActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)' }]}>
              <View style={[styles.dot, { backgroundColor: isStripeActive ? COLORS.success : COLORS.warning }]} />
              <Text style={[styles.statusPillText, { color: isStripeActive ? COLORS.success : COLORS.warning, fontWeight: '700' }]}>
                {isStripeActive ? 'ĐÃ KÍCH HOẠT' : 'CHƯA LIÊN KẾT'}
              </Text>
            </View>
          </View>

          {isStripeActive ? (
            /* Trạng thái ĐÃ KÍCH HOẠT */
            <View style={styles.stripeActiveBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.stripeInfoLabel}>Mã tài khoản:</Text>
                <Text style={styles.stripeInfoVal}>{stripeStatus?.stripeAccountId}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={styles.stripeInfoLabel}>Rút tiền về thẻ ATM:</Text>
                <Text style={[styles.stripeInfoVal, { color: COLORS.success, fontWeight: '700' }]}>Tự động giải ngân</Text>
              </View>

              <TouchableOpacity
                style={styles.stripeDashboardBtn}
                onPress={handleOpenStripeDashboard}
              >
                <Ionicons name="settings-outline" size={16} color={COLORS.stripeBrand} />
                <Text style={styles.stripeDashboardBtnText}>Quản lý thẻ ATM / Rút tiền trên Stripe Portal</Text>
                <Ionicons name="open-outline" size={16} color={COLORS.stripeBrand} />
              </TouchableOpacity>
            </View>
          ) : (
            /* Trạng thái CHƯA LIÊN KẾT */
            <View style={styles.stripeInactiveBox}>
              <Text style={styles.stripeInactiveDesc}>
                Bạn cần liên kết tài khoản ngân hàng để hệ thống tự động chuyển tiền các cuốc xe khách thanh toán qua thẻ.
              </Text>
              <Text style={styles.stripeTestNote}>
                💡 <Text style={{ fontWeight: '700' }}>Chế độ đồ án:</Text> Bấm nút "Skip this account form" ở đầu trang để kích hoạt ngay mà không cần giấy tờ thật.
              </Text>

              <TouchableOpacity
                style={styles.stripeOnboardBtn}
                onPress={handleConnectStripe}
                disabled={connectingStripe}
              >
                {connectingStripe ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="link" size={18} color="#FFF" />
                    <Text style={styles.stripeOnboardBtnText}>Liên kết tài khoản Stripe Express ngay</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* =========================================================================
            CARD 4: SỔ CÁI ĐỐI SOÁT GIẢI NGÂN & BÙ TRỪ NỢ (PAYOUT LEDGER)
           ========================================================================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Lịch Sử Nhận Tiền & Bù Trừ Nợ</Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted }}>{filteredPayouts.length} giao dịch</Text>
        </View>

        {/* Tabs Filter */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ALL')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'ALL' && styles.tabBtnTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'COMPLETED' && styles.tabBtnActive]}
            onPress={() => setActiveTab('COMPLETED')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'COMPLETED' && styles.tabBtnTextActive]}>Đã nhận tiền</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'OFFSET' && styles.tabBtnActive]}
            onPress={() => setActiveTab('OFFSET')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'OFFSET' && styles.tabBtnTextActive]}>Cấn trừ nợ</Text>
          </TouchableOpacity>
        </View>

        {filteredPayouts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>Chưa có giao dịch giải ngân nào phát sinh</Text>
          </View>
        ) : (
          filteredPayouts.map((tx) => (
            <View key={tx.id} style={styles.payoutCard}>
              <View style={styles.payoutTop}>
                <View>
                  <Text style={styles.payoutBookingCode}>Mã vé #{tx.bookingId}</Text>
                  <Text style={styles.payoutTime}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : 'Mới hoàn tất'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        tx.status === 'COMPLETED'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : tx.status === 'FULL_DEBT_OFFSET'
                          ? 'rgba(14, 165, 233, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)'
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color:
                          tx.status === 'COMPLETED'
                            ? COLORS.success
                            : tx.status === 'FULL_DEBT_OFFSET'
                            ? COLORS.primary
                            : COLORS.danger,
                        fontWeight: '700'
                      }
                    ]}
                  >
                    {tx.status === 'COMPLETED'
                      ? 'ĐÃ GIẢI NGÂN'
                      : tx.status === 'FULL_DEBT_OFFSET'
                      ? 'CẤN TRỪ HẾT NỢ'
                      : tx.status}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.payoutBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Giá vé khách trả (STRIPE):</Text>
                  <Text style={styles.breakdownVal}>+{formatMoney(tx.totalFare)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    Hoa hồng sàn ({((tx.commissionRate || 0.18) * 100).toFixed(0)}%):
                  </Text>
                  <Text style={[styles.breakdownVal, { color: COLORS.danger }]}>
                    -{formatMoney(tx.commissionAmount)}
                  </Text>
                </View>
                {tx.debtDeducted > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Cấn trừ nợ tiền mặt cuốc trước:</Text>
                    <Text style={[styles.breakdownVal, { color: COLORS.warning }]}>
                      -{formatMoney(tx.debtDeducted)}
                    </Text>
                  </View>
                )}
                <View style={styles.breakdownTotalRow}>
                  <Text style={styles.breakdownTotalLabel}>Thực nhận về tài khoản Stripe:</Text>
                  <Text style={styles.breakdownTotalVal}>+{formatMoney(tx.finalPayoutAmount)}</Text>
                </View>
              </View>

              {tx.stripeTransferId && tx.stripeTransferId !== 'N/A_FULL_OFFSET' && (
                <View style={styles.transferCodeRow}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  <Text style={styles.transferCodeText}>Mã chuyển tiền: {tx.stripeTransferId}</Text>
                </View>
              )}
            </View>
          ))
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // CARD BASE
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  debtAmount: { fontSize: 28, fontWeight: '800' },
  reputationScoreText: { fontSize: 26, fontWeight: '800', color: COLORS.text },

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

  // PROGRESS BAR
  progressSection: { marginVertical: 10 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressSub: { fontSize: 12, color: COLORS.textMuted },
  progressBarBg: { height: 8, backgroundColor: COLORS.cardBgLight, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
    marginBottom: 12
  },
  tipText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },

  payBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  payBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // REPUTATION
  shieldIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  commissionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardBgLight,
    padding: 12,
    borderRadius: 10,
    marginTop: 6
  },
  commissionSubLabel: { fontSize: 12, color: COLORS.textMuted },
  commissionRateValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  discountBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  reputationHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 10, lineHeight: 18 },

  // STRIPE CARD
  stripeActiveBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  stripeInfoLabel: { fontSize: 13, color: COLORS.textMuted },
  stripeInfoVal: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  stripeDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.stripeBrand,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4
  },
  stripeDashboardBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.stripeBrand },

  stripeInactiveBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)'
  },
  stripeInactiveDesc: { fontSize: 13, color: COLORS.text, lineHeight: 18, marginBottom: 8 },
  stripeTestNote: { fontSize: 12, color: COLORS.stripeBrand, lineHeight: 16, marginBottom: 12 },
  stripeOnboardBtn: {
    backgroundColor: COLORS.stripeBrand,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stripeOnboardBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // PAYOUT LEDGER LIST
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabBtnTextActive: { color: '#FFF', fontWeight: '700' },

  emptyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyText: { marginTop: 8, fontSize: 13, color: COLORS.textMuted },

  payoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  payoutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payoutBookingCode: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  payoutTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  payoutBreakdown: { gap: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 12, color: COLORS.textMuted },
  breakdownVal: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBgLight
  },
  breakdownTotalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  breakdownTotalVal: { fontSize: 14, fontWeight: '800', color: COLORS.success },
  transferCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBgLight
  },
  transferCodeText: { fontSize: 11, color: COLORS.textMuted }
});
