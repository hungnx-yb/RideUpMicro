import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView, Dimensions, ActivityIndicator,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/apiService';

const { width: SCREEN_W } = Dimensions.get('window');

// ===== DESIGN TOKENS =====
const COLORS = {
  bg: '#F0F4F8', surface: '#FFFFFF', primary: '#0ea5e9', primaryDark: '#0284c7',
  text: '#0F172A', textSec: '#475569', textMuted: '#94A3B8',
  green: '#10b981', greenBg: 'rgba(16,185,129,0.08)',
  orange: '#f97316', orangeBg: 'rgba(249,115,22,0.08)',
  yellow: '#f59e0b', yellowBg: 'rgba(245,158,11,0.08)',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.08)',
  border: '#E2E8F0', divider: '#F1F5F9',
};

// ===== STATUS CONFIG =====
const STATUS_MAP = {
  PENDING_PAYMENT:            { label: 'Chờ thanh toán',              color: COLORS.orange,  bg: COLORS.orangeBg, icon: 'time-outline' },
  WAITING_DRIVER_APPROVAL:    { label: 'Đang chờ tài xế duyệt',      color: COLORS.yellow,  bg: COLORS.yellowBg, icon: 'hourglass-outline' },
  CONFIRMED:                  { label: 'Đã xác nhận',                 color: COLORS.green,   bg: COLORS.greenBg,  icon: 'shield-checkmark-outline' },
  COMPLETED:                  { label: 'Hoàn thành',                  color: COLORS.green,   bg: COLORS.greenBg,  icon: 'checkmark-done-outline' },
  REJECTED_BY_DRIVER:         { label: 'Bị từ chối',                 color: COLORS.red,     bg: COLORS.redBg,    icon: 'close-circle-outline' },
  EXPIRED:                    { label: 'Hết hạn',                     color: COLORS.red,     bg: COLORS.redBg,    icon: 'time-outline' },
  CANCELLED_USER:             { label: 'Đã huỷ',                      color: COLORS.red,     bg: COLORS.redBg,    icon: 'close-circle-outline' },
  CANCELLED_DRIVER:           { label: 'Tài xế huỷ chuyến',           color: COLORS.red,     bg: COLORS.redBg,    icon: 'close-circle-outline' },
  CANCELLED_PAYMENT_FAILED:   { label: 'Lỗi thanh toán',              color: COLORS.red,     bg: COLORS.redBg,    icon: 'alert-circle-outline' },
};
const getStatus = (s) => STATUS_MAP[s] || { label: s || 'Không rõ', color: COLORS.textMuted, bg: '#f1f5f9', icon: 'ellipse-outline' };

const MOD_STATUS_MAP = {
  PENDING_DRIVER: { label: 'Chờ tài xế duyệt', color: '#f59e0b', bg: '#FEF3C7', icon: 'time-outline' },
  APPROVED:       { label: 'Tài xế đã duyệt',  color: '#10b981', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  REJECTED:       { label: 'Tài xế từ chối',   color: '#ef4444', bg: '#FEF2F2', icon: 'close-circle-outline' },
  EXPIRED:        { label: 'Hết hạn duyệt',    color: '#64748b', bg: '#F1F5F9', icon: 'hourglass-outline' },
};
const getModStatus = (s) => MOD_STATUS_MAP[s] || { label: s || 'Chờ duyệt', color: '#64748b', bg: '#F1F5F9', icon: 'ellipse-outline' };

// ===== HELPERS =====
const money = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`;
const fDate = (iso) => {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fTime = (iso) => {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// ──────────────────────────────── COMPONENT ────────────────────────────────
const BookingDetailScreen = ({ route, navigation }) => {
  const { booking: initialBooking } = route.params || {};
  const [booking, setBooking] = useState(initialBooking || {});
  const [trip, setTrip] = useState(initialBooking?.trip || null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [modifications, setModifications] = useState([]);
  const [loadingMods, setLoadingMods] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingMod, setSubmittingMod] = useState(false);
  const [editForm, setEditForm] = useState({
    pickupAddressText: '',
    dropoffAddressText: '',
    passengerName: '',
    passengerPhone: '',
    note: '',
  });

  const fetchModifications = useCallback(async (bookingId) => {
    if (!bookingId) return;
    setLoadingMods(true);
    try {
      const res = await apiService.getBookingModifications(bookingId);
      if (res?.data?.result) {
        setModifications(res.data.result);
      }
    } catch (err) {
      console.log('Fetch modifications error:', err);
    } finally {
      setLoadingMods(false);
    }
  }, []);

  useEffect(() => {
    if (booking?.id) {
      apiService.getBookingDetail(booking.id)
        .then(res => {
          if (res?.data?.result) {
            setBooking(prev => ({ ...prev, ...res.data.result }));
          }
        })
        .catch(err => console.log('Fetch booking detail error in BookingDetail:', err));

      fetchModifications(booking.id);
    }
  }, [booking?.id, fetchModifications]);

  useEffect(() => {
    if (booking?.tripId) {
      setLoadingTrip(true);
      apiService.getTripDetail(booking.tripId)
        .then(res => {
          if (res?.data?.result) {
            setTrip(res.data.result);
          }
        })
        .catch(err => console.log('Fetch trip error in BookingDetail:', err))
        .finally(() => setLoadingTrip(false));
    }
  }, [booking?.tripId]);

  if (!booking || !booking.id) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={{ textAlign: 'center', marginTop: 80, color: COLORS.textMuted }}>Không tìm thấy thông tin chuyến đi.</Text>
      </SafeAreaView>
    );
  }

  const status = getStatus(booking.status);
  const shortCode = (booking.bookingCode || booking.id || '').toUpperCase();

  // Location breakdown
  const pickupWardName = trip?.stops?.find(s => String(s.wardId) === String(booking.pickupWardId))?.addressText || '';
  const dropoffWardName = trip?.stops?.find(s => String(s.wardId) === String(booking.dropoffWardId))?.addressText || '';
  const startProvinceName = trip?.startAddressText || '';
  const endProvinceName = trip?.endAddressText || '';

  // ── Context‑aware actions ──
  const showChat     = ['CONFIRMED', 'RESERVED', 'PENDING_PAYMENT', 'WAITING_DRIVER_APPROVAL'].includes(booking.status);
  const showRate     = booking.status === 'COMPLETED';
  const showRebook   = ['COMPLETED', 'CANCELLED_USER', 'CANCELLED_DRIVER', 'REJECTED_BY_DRIVER', 'EXPIRED', 'CANCELLED_PAYMENT_FAILED'].includes(booking.status);

  // ── Modification Calculations ──
  const pendingMod = modifications.find(m => m.status === 'PENDING_DRIVER');
  const pastMods = modifications.filter(m => m.status !== 'PENDING_DRIVER');
  const approvedCount = modifications.filter(m => m.status === 'APPROVED').length;
  const canModify = ['CONFIRMED', 'WAITING_DRIVER_APPROVAL'].includes(booking.status) && !pendingMod && approvedCount < 2;

  const handleOpenEditModal = () => {
    setEditForm({
      pickupAddressText: booking.pickupAddressText || '',
      dropoffAddressText: booking.dropoffAddressText || '',
      passengerName: booking.passengerName || '',
      passengerPhone: booking.passengerPhone || '',
      note: '',
    });
    setIsModalOpen(true);
  };

  const handleSendModification = async () => {
    if (!editForm.pickupAddressText.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ điểm đón mới.');
      return;
    }
    if (!editForm.dropoffAddressText.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ điểm trả mới.');
      return;
    }

    setSubmittingMod(true);
    try {
      const payload = {
        pickupAddressText: editForm.pickupAddressText.trim(),
        pickupLat: booking.pickupLat != null ? Number(booking.pickupLat) : 21.0285,
        pickupLng: booking.pickupLng != null ? Number(booking.pickupLng) : 105.8542,
        pickupWardId: String(booking.pickupWardId || '0'),
        dropoffAddressText: editForm.dropoffAddressText.trim(),
        dropoffLat: booking.dropoffLat != null ? Number(booking.dropoffLat) : 20.8449,
        dropoffLng: booking.dropoffLng != null ? Number(booking.dropoffLng) : 106.6881,
        dropoffWardId: String(booking.dropoffWardId || '0'),
        passengerName: editForm.passengerName.trim(),
        passengerPhone: editForm.passengerPhone.trim(),
        note: editForm.note.trim(),
      };
      await apiService.requestBookingModification(booking.id, payload);
      setIsModalOpen(false);
      Alert.alert(
        'Đã gửi yêu cầu thành công',
        'Yêu cầu sửa đổi lộ trình đã được gửi tới tài xế. Tài xế có tối đa 15 phút để phản hồi.',
        [{ text: 'Đã hiểu' }]
      );
      fetchModifications(booking.id);
      apiService.getBookingDetail(booking.id).then(res => {
        if (res?.data?.result) {
          setBooking(prev => ({ ...prev, ...res.data.result }));
        }
      });
    } catch (err) {
      console.log('Modify booking error:', err);
      const errMsg = err?.response?.data?.message || 'Không thể gửi yêu cầu chỉnh sửa lúc này. Vui lòng thử lại sau.';
      Alert.alert('Không thể chỉnh sửa', errMsg);
    } finally {
      setSubmittingMod(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── TOP BAR ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Chi tiết chuyến đi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ═══ STATUS BANNER ═══ */}
        <View style={[s.statusBanner, { backgroundColor: status.bg, borderColor: status.color }]}>
          <Ionicons name={status.icon} size={28} color={status.color} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[s.statusLabel, { color: status.color }]}>{status.label}</Text>
            <Text style={s.statusCode}>Mã: {shortCode}</Text>
          </View>
        </View>

        {/* ═══ PENDING MODIFICATION ALERT ═══ */}
        {pendingMod && (
          <View style={s.modPendingCard}>
            <View style={s.modPendingHeader}>
              <View style={s.modPendingHeaderLeft}>
                <Ionicons name="time" size={18} color="#D97706" />
                <Text style={s.modPendingTitle}>YÊU CẦU ĐỔI LỘ TRÌNH ĐANG CHỜ DUYỆT</Text>
              </View>
              <View style={s.modPendingBadge}>
                <Text style={s.modPendingBadgeText}>TỐI ĐA 15 PHÚT</Text>
              </View>
            </View>

            <Text style={s.modPendingDesc}>
              Bạn đã đề xuất điều chỉnh thông tin đón/trả. Lộ trình mới sẽ được áp dụng ngay khi tài xế nhấn chấp thuận.
            </Text>

            <View style={s.modPendingDiff}>
              <View style={s.modDiffRow}>
                <Ionicons name="location" size={14} color={COLORS.primary} style={{ marginTop: 2, marginRight: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.modDiffLabel}>Điểm đón đề xuất:</Text>
                  <Text style={s.modDiffValue}>{pendingMod.newPickupAddressText}</Text>
                </View>
              </View>

              <View style={[s.modDiffRow, { marginTop: 8 }]}>
                <Ionicons name="flag" size={14} color={COLORS.orange} style={{ marginTop: 2, marginRight: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.modDiffLabel}>Điểm đến đề xuất:</Text>
                  <Text style={s.modDiffValue}>{pendingMod.newDropoffAddressText}</Text>
                </View>
              </View>

              {!!pendingMod.newNote && (
                <View style={[s.modDiffRow, { marginTop: 8 }]}>
                  <Ionicons name="chatbubble-outline" size={14} color={COLORS.textSec} style={{ marginTop: 2, marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.modDiffLabel}>Lý do / Ghi chú:</Text>
                    <Text style={s.modDiffValue}>{pendingMod.newNote}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={s.modPendingFooter}>
              <Ionicons name="information-circle-outline" size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={s.modPendingFooterText}>
                Hết hạn duyệt: {fTime(pendingMod.expiresAt)} • {fDate(pendingMod.expiresAt)}
              </Text>
            </View>
          </View>
        )}

        {/* ═══ ROUTE CARD ═══ */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Lộ trình đón trả</Text>

          <View style={s.routeWrap}>
            {/* Vertical line */}
            <View style={s.routeTimeline}>
              <View style={[s.dot, { backgroundColor: COLORS.primary }]} />
              <View style={s.dashLine} />
              <View style={[s.dot, { backgroundColor: COLORS.orange }]} />
            </View>

            <View style={s.routeTexts}>
              {/* Pickup */}
              <View style={s.routeBlock}>
                <Text style={s.routeTag}>ĐIỂM ĐÓN</Text>
                {startProvinceName ? (
                  <View style={s.addrBreakdown}>
                    <View style={s.addrItemRow}>
                      <Ionicons name="map-outline" size={13} color={COLORS.primary} style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={s.addrAreaText}>
                        <Text style={{ fontWeight: '700', color: COLORS.primary }}>Tỉnh/Thành: </Text>{startProvinceName}
                      </Text>
                    </View>
                    {!!pickupWardName && (
                      <View style={s.addrItemRow}>
                        <Ionicons name="business-outline" size={13} color={COLORS.primary} style={{ marginRight: 4, marginTop: 2 }} />
                        <Text style={s.addrAreaText}>
                          <Text style={{ fontWeight: '700', color: COLORS.text }}>Phường/Xã: </Text>{pickupWardName}
                        </Text>
                      </View>
                    )}
                    <View style={s.addrItemRow}>
                      <Ionicons name="navigate-outline" size={13} color={COLORS.primary} style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={s.addrDetailText}>
                        <Text style={{ fontWeight: '700', color: COLORS.text }}>Địa chỉ chi tiết: </Text>{booking.pickupAddressText || 'Không rõ'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.routeAddr} numberOfLines={3}>{booking.pickupAddressText || booking.pickupLocation || 'Không rõ'}</Text>
                )}
              </View>

              {/* Dropoff */}
              <View style={[s.routeBlock, { marginTop: 20 }]}>
                <Text style={[s.routeTag, { color: COLORS.orange }]}>ĐIỂM ĐẾN</Text>
                {endProvinceName ? (
                  <View style={s.addrBreakdown}>
                    <View style={s.addrItemRow}>
                      <Ionicons name="map-outline" size={13} color={COLORS.orange} style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={s.addrAreaText}>
                        <Text style={{ fontWeight: '700', color: COLORS.orange }}>Tỉnh/Thành: </Text>{endProvinceName}
                      </Text>
                    </View>
                    {!!dropoffWardName && (
                      <View style={s.addrItemRow}>
                        <Ionicons name="business-outline" size={13} color={COLORS.orange} style={{ marginRight: 4, marginTop: 2 }} />
                        <Text style={s.addrAreaText}>
                          <Text style={{ fontWeight: '700', color: COLORS.text }}>Phường/Xã: </Text>{dropoffWardName}
                        </Text>
                      </View>
                    )}
                    <View style={s.addrItemRow}>
                      <Ionicons name="navigate-outline" size={13} color={COLORS.orange} style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={s.addrDetailText}>
                        <Text style={{ fontWeight: '700', color: COLORS.text }}>Địa chỉ chi tiết: </Text>{booking.dropoffAddressText || booking.dropoffLocation || 'Không rõ'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={s.routeAddr} numberOfLines={3}>{booking.dropoffAddressText || booking.dropoffLocation || 'Không rõ'}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ═══ TRIP INFO ═══ */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Thông tin chuyến</Text>

          <InfoRow icon="calendar-outline" label="Ngày đặt" value={fDate(booking.createdAt)} />
          <InfoRow icon="time-outline" label="Giờ đặt" value={fTime(booking.createdAt)} />
          {(trip?.departureTime || booking.trip?.departureDate) && (
            <InfoRow icon="airplane-outline" label="Khởi hành" value={`${fTime(trip?.departureTime || booking.trip?.departureDate)} • ${fDate(trip?.departureTime || booking.trip?.departureDate)}`} />
          )}
          <InfoRow icon="people-outline" label="Số ghế" value={`${booking.seatsBooked || booking.seatCount || 1} ghế`} />
          {(trip?.vehicleBrand || trip?.vehicleModel || booking.trip?.vehicleType) && (
            <InfoRow icon="car-outline" label="Phương tiện" value={`${trip?.vehicleBrand || ''} ${trip?.vehicleModel || ''}`.trim() || booking.trip?.vehicleType} />
          )}
        </View>

        {/* ═══ PRICING ═══ */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Chi phí</Text>

          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Giá vé</Text>
            <Text style={s.priceVal}>{money(booking.totalAmount || booking.totalPrice || booking.price)}</Text>
          </View>
          {booking.discountAmount > 0 && (
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>Giảm giá</Text>
              <Text style={[s.priceVal, { color: COLORS.green }]}>-{money(booking.discountAmount)}</Text>
            </View>
          )}
          <View style={s.priceDivider} />
          <View style={s.priceRow}>
            <Text style={[s.priceLabel, { fontWeight: '800', color: COLORS.text }]}>Tổng thanh toán</Text>
            <Text style={[s.priceVal, { fontWeight: '800', color: COLORS.primary, fontSize: 20 }]}>
              {money(booking.totalAmount || booking.finalPrice || booking.totalPrice || booking.price)}
            </Text>
          </View>

          {/* ── Phương thức thanh toán ── */}
          <View style={s.priceDivider} />
          {(() => {
            const isStripe = booking.paymentMethod === 'STRIPE' || (booking.paymentMethod !== 'CASH' && (booking.paymentStatus === 'HOLDING' || booking.paymentId?.startsWith('pi_')));
            const methodLabel = isStripe ? 'Thẻ quốc tế (Stripe)' : 'Tiền mặt';
            const methodIcon = isStripe ? 'card' : 'cash-outline';
            const methodColor = isStripe ? '#2563EB' : '#D97706';

            // Payment status config
            let statusLabel, statusIcon, statusBg, statusColor, guidanceText;
            if (isStripe) {
              if (booking.paymentStatus === 'PAID') {
                statusLabel = 'Đã thanh toán';
                statusIcon = 'checkmark-circle';
                statusBg = '#ECFDF5'; statusColor = '#059669';
                guidanceText = 'Số tiền đã được thanh toán thành công qua thẻ. Bạn không cần trả thêm cho tài xế.';
              } else if (booking.paymentStatus === 'HOLDING') {
                statusLabel = 'Đã giữ cọc qua thẻ';
                statusIcon = 'shield-checkmark';
                statusBg = '#EFF6FF'; statusColor = '#2563EB';
                guidanceText = 'Số tiền đang được giữ an toàn trên thẻ của bạn. Sau khi hoàn thành chuyến, tiền sẽ tự động chuyển cho tài xế.';
              } else if (booking.paymentStatus === 'REFUNDED' || booking.paymentStatus === 'VOIDED') {
                statusLabel = 'Đã hoàn tiền';
                statusIcon = 'refresh-circle';
                statusBg = '#F3F4F6'; statusColor = '#6B7280';
                guidanceText = 'Số tiền đã được hoàn về thẻ của bạn.';
              } else if (booking.paymentStatus === 'FAILED') {
                statusLabel = 'Thanh toán thất bại';
                statusIcon = 'close-circle';
                statusBg = '#FEF2F2'; statusColor = '#DC2626';
                guidanceText = 'Thanh toán qua thẻ không thành công. Vui lòng thử lại hoặc chọn phương thức khác.';
              } else {
                statusLabel = 'Chờ thanh toán';
                statusIcon = 'time-outline';
                statusBg = '#FEF3C7'; statusColor = '#D97706';
                guidanceText = 'Đang xử lý thanh toán qua thẻ...';
              }
            } else {
              // Cash
              if (booking.paymentStatus === 'PAID') {
                statusLabel = 'Đã thanh toán';
                statusIcon = 'checkmark-circle';
                statusBg = '#ECFDF5'; statusColor = '#059669';
                guidanceText = 'Bạn đã thanh toán tiền mặt cho tài xế.';
              } else {
                statusLabel = 'Thu tiền mặt khi đi';
                statusIcon = 'wallet-outline';
                statusBg = '#FEF3C7'; statusColor = '#D97706';
                guidanceText = 'Vui lòng chuẩn bị tiền mặt để trả trực tiếp cho tài xế khi lên xe.';
              }
            }

            return (
              <>
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Phương thức</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={methodIcon} size={16} color={methodColor} style={{ marginRight: 5 }} />
                    <Text style={[s.priceVal, { color: methodColor, fontSize: 14 }]}>{methodLabel}</Text>
                  </View>
                </View>

                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Thanh toán</Text>
                  <View style={[s.payStatusBadge, { backgroundColor: statusBg }]}>
                    <Ionicons name={statusIcon} size={14} color={statusColor} style={{ marginRight: 4 }} />
                    <Text style={[s.payStatusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>

                {/* Guidance box */}
                <View style={[s.payGuidanceBox, { backgroundColor: statusBg, borderColor: statusColor + '30' }]}>
                  <Ionicons name="information-circle-outline" size={16} color={statusColor} style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={[s.payGuidanceText, { color: statusColor }]}>{guidanceText}</Text>
                </View>
              </>
            );
          })()}
        </View>

        {/* ═══ MODIFICATION HISTORY ═══ */}
        {pastMods.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Lịch sử đổi lộ trình ({pastMods.length})</Text>
            {pastMods.map((item, idx) => {
              const mStatus = getModStatus(item.status);
              return (
                <View key={item.id || idx} style={[s.modHistoryItem, idx > 0 && s.modHistoryBorder]}>
                  <View style={s.modHistoryTop}>
                    <View style={[s.modStatusChip, { backgroundColor: mStatus.bg }]}>
                      <Ionicons name={mStatus.icon} size={13} color={mStatus.color} style={{ marginRight: 4 }} />
                      <Text style={[s.modStatusChipText, { color: mStatus.color }]}>{mStatus.label}</Text>
                    </View>
                    <Text style={s.modHistoryTime}>{fTime(item.resolvedAt || item.createdAt)} • {fDate(item.resolvedAt || item.createdAt)}</Text>
                  </View>
                  <Text style={s.modHistoryRoute} numberOfLines={2}>
                    <Text style={{ fontWeight: '700' }}>Đón: </Text>{item.newPickupAddressText}
                  </Text>
                  <Text style={s.modHistoryRoute} numberOfLines={2}>
                    <Text style={{ fontWeight: '700' }}>Trả: </Text>{item.newDropoffAddressText}
                  </Text>
                  {!!item.rejectionReason && (
                    <Text style={s.modRejectReason}>Lý do từ chối: {item.rejectionReason}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ DRIVER INFO ═══ */}
        {(booking.trip?.driverName || booking.driverName) && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Tài xế</Text>
            <View style={s.driverRow}>
              <View style={s.avatarCircle}>
                <Ionicons name="person" size={26} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.driverName}>{booking.trip?.driverName || booking.driverName || 'Tài xế'}</Text>
                {(booking.trip?.vehicleType || booking.trip?.vehiclePlate) && (
                  <Text style={s.driverSub}>
                    {booking.trip?.vehicleType}{booking.trip?.vehiclePlate ? ` • ${booking.trip.vehiclePlate}` : ''}
                  </Text>
                )}
                {booking.trip?.driverRating > 0 && (
                  <View style={s.ratingRow}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={s.ratingText}>{booking.trip.driverRating}/5 sao</Text>
                  </View>
                )}
              </View>
              {showChat && (
                <TouchableOpacity
                  style={s.driverChatBtn}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('BookingChat', {
                    bookingId: booking.id,
                    driverName: booking.trip?.driverName || booking.driverName || 'Tài xế',
                    driverAvatar: booking.trip?.driverAvatar,
                    vehicleInfo: booking.trip?.vehicleType || 'Xe',
                  })}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ═══ ACTION BUTTONS ═══ */}
        <View style={s.actions}>
          {canModify && (
            <TouchableOpacity
              style={s.btnSecondary}
              activeOpacity={0.8}
              onPress={handleOpenEditModal}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              <Text style={s.btnSecondaryText}>Sửa điểm đón / trả (Còn {2 - approvedCount}/2 lần)</Text>
            </TouchableOpacity>
          )}

          {showChat && (
            <TouchableOpacity
              style={s.btnPrimary}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('BookingChat', {
                bookingId: booking.id,
                driverName: booking.trip?.driverName || booking.driverName || 'Tài xế',
                driverAvatar: booking.trip?.driverAvatar,
                vehicleInfo: booking.trip?.vehicleType || 'Xe',
              })}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
              <Text style={s.btnPrimaryText}>Nhắn tin tài xế</Text>
            </TouchableOpacity>
          )}

          {showRate && (
            <TouchableOpacity
              style={s.btnPrimary}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Rating', {
                bookingId: booking.id,
                driverName: booking.trip?.driverName || booking.driverName || 'Tài xế',
              })}
            >
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={s.btnPrimaryText}>Đánh giá chuyến đi</Text>
            </TouchableOpacity>
          )}

          {showRebook && (
            <TouchableOpacity
              style={s.btnOutline}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SearchRide')}
            >
              <Ionicons name="search" size={18} color={COLORS.primary} />
              <Text style={s.btnOutlineText}>Đặt lại chuyến mới</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══ MODAL CHỈNH SỬA LỘ TRÌNH ═══ */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalContainer}>
            {/* Header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Sửa điểm đón / trả</Text>
                <Text style={s.modalSubtitle}>Thay đổi thông tin đón trả có kiểm soát</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={s.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalForm}>
              {/* Notice Policy */}
              <View style={s.modalNoticeBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={s.modalNoticeText}>
                  Chính sách: Bạn được chỉnh sửa tối đa 2 lần và phải thực hiện trước giờ xuất phát ít nhất 2 tiếng. Tài xế có 15 phút để phản hồi xác nhận.
                </Text>
              </View>

              {/* Input Đón */}
              <View style={s.formGroup}>
                <Text style={s.formLabel}>
                  <Ionicons name="location" size={13} color={COLORS.primary} /> ĐỊA CHỈ ĐÓN MỚI <Text style={{ color: COLORS.red }}>*</Text>
                </Text>
                <TextInput
                  style={s.formInput}
                  placeholder="Nhập chi tiết điểm đón (số nhà, ngõ, đường...)"
                  placeholderTextColor={COLORS.textMuted}
                  value={editForm.pickupAddressText}
                  onChangeText={(text) => setEditForm(p => ({ ...p, pickupAddressText: text }))}
                  multiline
                />
              </View>

              {/* Input Trả */}
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: COLORS.orange }]}>
                  <Ionicons name="flag" size={13} color={COLORS.orange} /> ĐỊA CHỈ TRẢ MỚI <Text style={{ color: COLORS.red }}>*</Text>
                </Text>
                <TextInput
                  style={s.formInput}
                  placeholder="Nhập chi tiết điểm trả (số nhà, ngõ, đường...)"
                  placeholderTextColor={COLORS.textMuted}
                  value={editForm.dropoffAddressText}
                  onChangeText={(text) => setEditForm(p => ({ ...p, dropoffAddressText: text }))}
                  multiline
                />
              </View>

              {/* Input Hành Khách */}
              <View style={s.formRow}>
                <View style={[s.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={s.formLabel}>TÊN HÀNH KHÁCH</Text>
                  <TextInput
                    style={s.formInputSingle}
                    placeholder="Tên người đi"
                    placeholderTextColor={COLORS.textMuted}
                    value={editForm.passengerName}
                    onChangeText={(text) => setEditForm(p => ({ ...p, passengerName: text }))}
                  />
                </View>
                <View style={[s.formGroup, { flex: 1 }]}>
                  <Text style={s.formLabel}>SỐ ĐIỆN THOẠI</Text>
                  <TextInput
                    style={s.formInputSingle}
                    placeholder="SĐT liên hệ"
                    keyboardType="phone-pad"
                    placeholderTextColor={COLORS.textMuted}
                    value={editForm.passengerPhone}
                    onChangeText={(text) => setEditForm(p => ({ ...p, passengerPhone: text }))}
                  />
                </View>
              </View>

              {/* Input Ghi chú */}
              <View style={s.formGroup}>
                <Text style={s.formLabel}>LÝ DO / GHI CHÚ CHO TÀI XẾ</Text>
                <TextInput
                  style={[s.formInput, { height: 70 }]}
                  placeholder="Ví dụ: Đổi sang cổng đối diện, em mang thêm 1 vali nhỏ..."
                  placeholderTextColor={COLORS.textMuted}
                  value={editForm.note}
                  onChangeText={(text) => setEditForm(p => ({ ...p, note: text }))}
                  multiline
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={s.modalBtnCancel}
                onPress={() => setIsModalOpen(false)}
                disabled={submittingMod}
              >
                <Text style={s.modalBtnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnSubmit, submittingMod && { opacity: 0.7 }]}
                onPress={handleSendModification}
                disabled={submittingMod}
              >
                {submittingMod ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#fff" />
                    <Text style={s.modalBtnSubmitText}>Gửi cho tài xế</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ── Reusable row ──
const InfoRow = ({ icon, label, value }) => (
  <View style={s.infoRow}>
    <View style={s.infoIcon}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
    </View>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{value}</Text>
  </View>
);

// ════════════════════════════════ STYLES ════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // Top Bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  scroll: { padding: 16 },

  // Status Banner
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderLeftWidth: 5, marginBottom: 16 },
  statusLabel: { fontSize: 16, fontWeight: '800' },
  statusCode: { fontSize: 12, color: COLORS.textSec, marginTop: 2, fontWeight: '600' },

  // Card
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: COLORS.divider },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },

  // Route
  routeWrap: { flexDirection: 'row' },
  routeTimeline: { width: 24, alignItems: 'center', paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dashLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 3 },
  routeTexts: { flex: 1, marginLeft: 10 },
  routeBlock: {},
  routeTag: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 3 },
  routeAddr: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  addrBreakdown: { marginTop: 4, gap: 4 },
  addrItemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  addrAreaText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 },
  addrDetailText: { flex: 1, fontSize: 13, color: COLORS.textSec, lineHeight: 19 },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(14,165,233,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.textSec, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  // Pricing
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  priceLabel: { fontSize: 14, color: COLORS.textSec, fontWeight: '500' },
  priceVal: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  priceDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },

  // Driver
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(14,165,233,0.08)', alignItems: 'center', justifyContent: 'center' },
  driverName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  driverSub: { fontSize: 13, color: COLORS.textSec, marginTop: 2, fontWeight: '500' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  driverChatBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(14,165,233,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Actions
  actions: { marginTop: 6, gap: 12 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 15, borderRadius: 14, gap: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingVertical: 15, borderRadius: 14, gap: 10, borderWidth: 2, borderColor: COLORS.primary },
  btnOutlineText: { color: COLORS.primary, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  // Payment Status
  payStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  payStatusText: { fontSize: 12, fontWeight: '700' },
  payGuidanceBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  payGuidanceText: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18 },

  // Pending Modification Card
  modPendingCard: { backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#F59E0B', shadowColor: '#D97706', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  modPendingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modPendingHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  modPendingTitle: { fontSize: 13, fontWeight: '800', color: '#B45309' },
  modPendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' },
  modPendingBadgeText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  modPendingDesc: { fontSize: 12, color: '#92400E', lineHeight: 18, marginBottom: 12 },
  modPendingDiff: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 10 },
  modDiffRow: { flexDirection: 'row', alignItems: 'flex-start' },
  modDiffLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSec },
  modDiffValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 2, lineHeight: 18 },
  modPendingFooter: { flexDirection: 'row', alignItems: 'center' },
  modPendingFooterText: { fontSize: 12, color: '#B45309', fontWeight: '600' },

  // Modification History
  modHistoryItem: { paddingVertical: 12 },
  modHistoryBorder: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  modHistoryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modStatusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  modStatusChipText: { fontSize: 11, fontWeight: '700' },
  modHistoryTime: { fontSize: 11, color: COLORS.textMuted },
  modHistoryRoute: { fontSize: 13, color: COLORS.textSec, lineHeight: 19, marginTop: 2 },
  modRejectReason: { fontSize: 12, color: COLORS.red, fontStyle: 'italic', marginTop: 4 },

  // Secondary Button
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F9FF', paddingVertical: 15, borderRadius: 14, gap: 10, borderWidth: 1.5, borderColor: COLORS.primary },
  btnSecondaryText: { color: COLORS.primaryDark, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_W > 400 ? '90%' : '95%', paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalForm: { padding: 20 },
  modalNoticeBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0F9FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 16 },
  modalNoticeText: { flex: 1, fontSize: 12, color: '#0369A1', lineHeight: 18 },
  formGroup: { marginBottom: 14 },
  formRow: { flexDirection: 'row' },
  formLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textSec, marginBottom: 6, letterSpacing: 0.3 },
  formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text, minHeight: 46, textAlignVertical: 'top' },
  formInputSingle: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text, height: 46 },
  modalActionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, paddingTop: 10 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalBtnCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSec },
  modalBtnSubmit: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalBtnSubmitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

export default BookingDetailScreen;
