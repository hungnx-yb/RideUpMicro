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

const formatStripeAccountId = (id) => {
  if (!id) return '';
  if (id.length <= 12) return id;
  return `${id.slice(0, 9)}••••${id.slice(-4)}`;
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
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'OFFSET'
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
                {reputation?.effectiveRate
                  ? (Number(reputation.effectiveRate) * 100).toFixed(1)
                  : reputation?.baseRate
                    ? (Number(reputation.baseRate) * 100).toFixed(1)
                    : '18.0'}%
              </Text>
            </View>
            {reputation?.discount && Number(reputation.discount) > 0 ? (
              <View style={styles.discountBadge}>
                <Ionicons name="trending-down" size={14} color={COLORS.success} />
                <Text style={styles.discountBadgeText}>
                  Giảm {(Number(reputation.discount) * 100).toFixed(1)}% phí sàn
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                Mức gốc: {reputation?.baseRate ? (Number(reputation.baseRate) * 100).toFixed(1) : '18.0'}%
              </Text>
            )}
          </View>

          <Text style={styles.reputationHint}>
            ✨ Lái xe an toàn (+1đ/chuyến) và nhận đánh giá 5 sao (+1đ) để được giảm hoa hồng tới mức tối đa 12.0%!
          </Text>
        </View>

        {/* =========================================================================
            CARD 2B: THỐNG KÊ ĐÁNH GIÁ SAO (1-5 SAO & SAO TRUNG BÌNH TÍNH HOA HỒNG)
           ========================================================================= */}
        <DriverRatingCard
          averageRating={reputation?.driverRating}
          reviews={driverReviews}
        />

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
            /* Trạng thái ĐÃ KÍCH HOẠT: Digital Card Hiện Đại */
            <View>
              <View style={styles.digitalCard}>
                <View style={styles.digitalCardTop}>
                  <View style={styles.digitalCardChip}>
                    <Ionicons name="hardware-chip-outline" size={24} color="#CBD5E1" />
                    <Ionicons name="wifi" size={17} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }], marginLeft: 6 }} />
                  </View>
                  <View style={styles.digitalCardBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                    <Text style={styles.digitalCardBadgeText}>SẴN SÀNG NHẬN TIỀN</Text>
                  </View>
                </View>

                <View style={styles.digitalCardMiddle}>
                  <Text style={styles.digitalCardNumber}>
                    {formatStripeAccountId(stripeStatus?.stripeAccountId)}
                  </Text>
                  <Text style={styles.digitalCardBrand}>STRIPE EXPRESS PAYOUT</Text>
                </View>

                <View style={styles.digitalCardBottom}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="flash" size={14} color="#38BDF8" />
                    <Text style={styles.digitalCardPayoutText}>Tự động giải ngân về thẻ ATM</Text>
                  </View>
                  <View style={styles.digitalCardLogoWrap}>
                    <Text style={styles.digitalCardLogoText}>stripe</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.stripeDashboardBtn}
                onPress={handleOpenStripeDashboard}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="settings-outline" size={16} color={COLORS.stripeBrand} />
                  <Text style={styles.stripeDashboardBtnText}>Cài đặt thẻ ATM & Rút tiền</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={COLORS.stripeBrand} />
              </TouchableOpacity>
            </View>
          ) : (
            /* Trạng thái CHƯA LIÊN KẾT */
            <View style={styles.stripeInactiveBox}>
              <View style={styles.stripeInactiveHeader}>
                <View style={styles.stripeIconCircle}>
                  <Ionicons name="link-outline" size={22} color={COLORS.stripeBrand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stripeInactiveTitle}>Liên kết tài khoản ngân hàng</Text>
                  <Text style={styles.stripeInactiveDesc}>
                    Hệ thống sẽ tự động giải ngân doanh thu các cuốc xe trực tuyến về thẻ ATM của bạn.
                  </Text>
                </View>
              </View>

              <View style={styles.stripeTestHintBox}>
                <Ionicons name="bulb-outline" size={15} color={COLORS.stripeBrand} />
                <Text style={styles.stripeTestHintText}>
                  <Text style={{ fontWeight: '700' }}>Chế độ thử nghiệm:</Text> Bấm "Skip this account form" trên trang Stripe để kích hoạt tức thì.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.stripeOnboardBtn}
                onPress={handleConnectStripe}
                disabled={connectingStripe}
                activeOpacity={0.8}
              >
                {connectingStripe ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="flash" size={17} color="#FFF" />
                    <Text style={styles.stripeOnboardBtnText}>Liên kết tài khoản Stripe ngay</Text>
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
          <Text style={styles.sectionSubCount}>{filteredPayouts.length} giao dịch</Text>
        </View>

        {/* Tabs Filter */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ALL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'ALL' && styles.tabBtnTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'COMPLETED' && styles.tabBtnActive]}
            onPress={() => setActiveTab('COMPLETED')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'COMPLETED' && styles.tabBtnTextActive]}>Đã nhận tiền</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'OFFSET' && styles.tabBtnActive]}
            onPress={() => setActiveTab('OFFSET')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'OFFSET' && styles.tabBtnTextActive]}>Cấn trừ nợ</Text>
          </TouchableOpacity>
        </View>

        {filteredPayouts.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={28} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTextTitle}>Chưa có giao dịch</Text>
            <Text style={styles.emptyText}>Chưa có giao dịch giải ngân hoặc cấn trừ nợ nào phát sinh</Text>
          </View>
        ) : (
          filteredPayouts.map((tx) => {
            const isExpanded = !!expandedPayouts[tx.id];
            const meta = getPayoutStatusMeta(tx.status);
            const bookingShort = formatBookingCode(tx.bookingId);
            const payoutAmount = Number(tx.finalPayoutAmount) || 0;

            return (
              <TouchableOpacity
                key={tx.id}
                style={[styles.payoutCard, isExpanded && styles.payoutCardExpanded]}
                onPress={() => toggleExpandPayout(tx.id)}
                activeOpacity={0.85}
              >
                {/* Header Row: Icon + Title + Amount */}
                <View style={styles.payoutHeaderRow}>
                  <View style={[styles.payoutIconCircle, { backgroundColor: meta.iconBg }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>

                  <View style={styles.payoutMainInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={styles.payoutBookingTitle}>Cuốc #{bookingShort}</Text>
                      {meta.label ? (
                        <View style={[styles.miniStatusPill, { backgroundColor: meta.bgColor }]}>
                          <Text style={[styles.miniStatusText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.payoutTimeText}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : 'Mới hoàn tất'}
                    </Text>
                  </View>

                  <View style={styles.payoutAmountWrap}>
                    <Text style={[styles.payoutAmountText, { color: payoutAmount > 0 ? COLORS.success : COLORS.text }]}>
                      {payoutAmount > 0 ? `+${formatMoney(payoutAmount)}` : formatMoney(payoutAmount)}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color={COLORS.textMuted}
                      style={{ alignSelf: 'flex-end', marginTop: 3 }}
                    />
                  </View>
                </View>

                {/* Expanded Breakdown */}
                {isExpanded && (
                  <View style={styles.payoutDetailBox}>
                    <View style={styles.detailReceiptHeader}>
                      <Text style={styles.detailReceiptTitle}>CHI TIẾT ĐỐI SOÁT CUỐC XE</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Giá vé khách thanh toán (Stripe):</Text>
                      <Text style={styles.detailVal}>+{formatMoney(tx.totalFare)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        Phí sàn ({((Number(tx.commissionRate) || 0.18) * 100).toFixed(1)}%):
                      </Text>
                      <Text style={[styles.detailVal, { color: COLORS.danger }]}>
                        -{formatMoney(tx.commissionAmount)}
                      </Text>
                    </View>

                    {tx.debtDeducted > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Cấn trừ dư nợ hoa hồng cũ:</Text>
                        <Text style={[styles.detailVal, { color: COLORS.warning, fontWeight: '700' }]}>
                          -{formatMoney(tx.debtDeducted)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.detailDivider} />

                    <View style={styles.detailTotalRow}>
                      <Text style={styles.detailTotalLabel}>Thực nhận về ví Stripe:</Text>
                      <Text style={[styles.detailTotalVal, { color: payoutAmount > 0 ? COLORS.success : COLORS.text }]}>
                        +{formatMoney(payoutAmount)}
                      </Text>
                    </View>

                    {meta.desc ? (
                      <View style={styles.detailDescBox}>
                        <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
                        <Text style={styles.detailDescText}>{meta.desc}</Text>
                      </View>
                    ) : null}

                    {tx.stripeTransferId && tx.stripeTransferId.startsWith('tr_') ? (
                      <View style={styles.detailTransferBox}>
                        <Ionicons name="checkmark-done" size={14} color={COLORS.success} />
                        <Text style={styles.detailTransferText}>
                          Mã GD Stripe: <Text style={{ fontWeight: '700' }}>{tx.stripeTransferId}</Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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

  // STRIPE DIGITAL CARD
  digitalCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#3730A3'
  },
  digitalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  digitalCardChip: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  digitalCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  digitalCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.5
  },
  digitalCardMiddle: {
    marginVertical: 16
  },
  digitalCardNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  digitalCardBrand: {
    fontSize: 10,
    color: '#A5B4FC',
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4
  },
  digitalCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12
  },
  digitalCardPayoutText: {
    fontSize: 11,
    color: '#E0E7FF',
    fontWeight: '600'
  },
  digitalCardLogoWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  digitalCardLogoText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  stripeDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 12
  },
  stripeDashboardBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text
  },

  stripeInactiveBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)'
  },
  stripeInactiveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12
  },
  stripeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stripeInactiveTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4
  },
  stripeInactiveDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17
  },
  stripeTestHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14
  },
  stripeTestHintText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.stripeBrand,
    lineHeight: 16
  },
  stripeOnboardBtn: {
    backgroundColor: COLORS.stripeBrand,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stripeOnboardBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700'
  },

  // PAYOUT LEDGER LIST
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  sectionSubCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  tabBtnTextActive: {
    color: '#FFF',
    fontWeight: '700'
  },

  emptyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.cardBgLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  emptyTextTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center'
  },

  payoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  payoutCardExpanded: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  payoutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  payoutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  payoutMainInfo: {
    flex: 1
  },
  payoutBookingTitle: {
    fontSize: 14,
    fontWeight: '700',
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
  payoutTimeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  payoutAmountWrap: {
    alignItems: 'flex-end'
  },
  payoutAmountText: {
    fontSize: 15,
    fontWeight: '800'
  },

  payoutDetailBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBgLight,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10
  },
  detailReceiptHeader: {
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  detailReceiptTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8
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
    backgroundColor: '#E2E8F0',
    marginVertical: 8
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text
  },
  detailTotalVal: {
    fontSize: 15,
    fontWeight: '800'
  },
  detailDescBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6
  },
  detailDescText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15
  },
  detailTransferBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4
  },
  detailTransferText: {
    fontSize: 11,
    color: COLORS.textMuted
  }
});
